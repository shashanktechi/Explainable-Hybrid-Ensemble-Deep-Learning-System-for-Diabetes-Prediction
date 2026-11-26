"""Load a trained artifact and produce class probabilities."""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd


class EnsemblePredictor:
    def __init__(self, artifact_path: str | Path):
        self.path = Path(artifact_path)
        if not self.path.is_file():
            raise FileNotFoundError(f"Model artifact not found: {self.path}")
        self.bundle = joblib.load(self.path)

    @property
    def classes(self):
        return list(self.bundle["classes"])

    def predict_proba(self, features: dict) -> dict[str, float]:
        missing = set(self.bundle["features"]) - set(features)
        if missing:
            raise ValueError(f"Missing model features: {sorted(missing)}")
        output = self._predict_matrix(pd.DataFrame([{name: features[name] for name in self.bundle["features"]}]))[0]
        names = self.bundle.get("class_mapping")
        if not names:
            return {name: float(prob) for name, prob in zip(self.classes, output)}
        mapped = {names[name]: float(prob) for name, prob in zip(self.classes, output)}
        return {name: mapped.get(name, 0.0) for name in ("Non-Diabetic", "Pre-Diabetic", "Diabetic")}

    def _predict_matrix(self, frame: pd.DataFrame) -> np.ndarray:
        frame = frame[self.bundle["features"]].copy()
        for feature in self.bundle.get("zero_as_missing", []):
            frame[feature] = frame[feature].mask(frame[feature] == 0, np.nan)
        probabilities = [model.predict_proba(prep.transform(frame[self.bundle["features"]]))
                         for prep, model in self.bundle["bases"].values()]
        return self.bundle["meta"].predict_proba(np.hstack(probabilities))

    def explain(self, features: dict, *, lime_samples: int = 1500):
        """Return model-agnostic local SHAP and LIME contributions for diabetic risk."""
        try:
            import shap
            from lime.lime_tabular import LimeTabularExplainer
        except ImportError as exc:
            raise RuntimeError("Install ml/requirements.txt to enable SHAP and LIME") from exc
        columns = self.bundle["features"]
        background = pd.DataFrame(self.bundle["explanation_background"])[columns]
        row = pd.DataFrame([{name: features.get(name) for name in columns}]).reindex(columns=columns)
        categorical = [name for name in columns if not pd.api.types.is_numeric_dtype(background[name])]
        category_maps = {name: list(pd.unique(background[name].dropna().astype(str))) for name in categorical}
        numeric_features = [name for name in columns if name not in categorical]
        background[numeric_features] = background[numeric_features].apply(
            lambda col: col.fillna(col.median()))
        for name in categorical:
            fill = str(background[name].mode().iloc[0])
            background[name] = background[name].fillna(fill).astype(str)
        for name in numeric_features:
            row[name] = row[name].fillna(background[name].iloc[0])
        row[numeric_features] = row[numeric_features].astype(float)
        mapping = self.bundle.get("class_mapping") or {name: name for name in self.classes}
        display_classes = (["Non-Diabetic", "Pre-Diabetic", "Diabetic"] if self.bundle.get("class_mapping")
                           else list(self.classes))
        class_index = display_classes.index("Diabetic") if "Diabetic" in display_classes else len(display_classes) - 1

        categorical_indices = [columns.index(name) for name in categorical]
        categorical_names = {columns.index(name): [*category_maps[name], "__unknown__"]
                             for name in categorical}
        background_matrix = background.copy()
        row_matrix = row.copy()
        for name in categorical:
            categories = category_maps[name]
            category_to_code = {value: index for index, value in enumerate(categories)}
            unknown = len(categories)
            background_matrix[name] = background_matrix[name].map(category_to_code).fillna(unknown)
            row_matrix[name] = row_matrix[name].map(lambda value: category_to_code.get(str(value), unknown))

        def predict(batch):
            numeric_batch = np.asarray(batch, dtype=float)
            decoded = pd.DataFrame(numeric_batch, columns=columns)
            for name in categorical:
                categories = category_maps[name]
                codes = np.rint(numeric_batch[:, columns.index(name)]).astype(int)
                decoded[name] = [categories[code] if 0 <= code < len(categories) else "__unknown__"
                                 for code in codes]
            raw = self._predict_matrix(decoded)
            mapping = self.bundle.get("class_mapping")
            if not mapping:
                return raw
            mapped_columns = []
            for name in display_classes:
                indices = [idx for idx, source_label in enumerate(self.classes)
                           if mapping[source_label] == name]
                mapped_columns.append(raw[:, indices].sum(axis=1) if indices else np.zeros(len(raw)))
            return np.column_stack(mapped_columns)

        explain = shap.KernelExplainer(predict, background_matrix.to_numpy(dtype=float))
        shap_result = explain.shap_values(row_matrix.to_numpy(dtype=float), nsamples=100)
        if isinstance(shap_result, list):
            shap_row = np.asarray(shap_result[class_index]).reshape(-1)
        else:
            shap_array = np.asarray(shap_result)
            shap_row = shap_array[0, :, class_index] if shap_array.ndim == 3 else shap_array.reshape(-1)
        lime = LimeTabularExplainer(background_matrix.to_numpy(dtype=float), feature_names=columns,
                                    class_names=display_classes, mode="classification",
                                    categorical_features=categorical_indices,
                                    categorical_names=categorical_names,
                                    random_state=self.bundle.get("seed", 42))
        local = lime.explain_instance(row_matrix.to_numpy(dtype=float)[0], predict, labels=(class_index,),
                                      num_samples=lime_samples)
        lime_values = {columns[index]: float(weight)
                       for index, weight in local.as_map()[class_index]}
        return ({name: float(value) for name, value in zip(columns, shap_row)}, lime_values)
