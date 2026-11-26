"""Reproducible OOF stacking training with an untouched test partition."""

import hashlib
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator
from sklearn.metrics import (accuracy_score, balanced_accuracy_score, f1_score,
                             log_loss, matthews_corrcoef, roc_auc_score)
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import LabelEncoder

from ml.models import make_base_models
from ml.preprocessing import DatasetContract, clean_frame, make_preprocessor


def _resample(X, y, strategy, seed):
    if strategy == "none":
        return X, y
    if strategy != "smote":
        raise ValueError("resampling must be one of: none, smote")
    try:
        from imblearn.over_sampling import SMOTE
    except ImportError as exc:
        raise RuntimeError("SMOTE requires imbalanced-learn; install ml/requirements.txt") from exc
    counts = np.bincount(y)
    if not len(counts) or counts.min() < 2:
        raise ValueError("SMOTE requires at least two training samples in every class")
    return SMOTE(random_state=seed, k_neighbors=min(5, int(counts.min()) - 1)).fit_resample(X, y)


def _fit_fold(frame, contract, y, indices, model, resampling, seed):
    prep = make_preprocessor(frame, contract.feature_columns)
    X = prep.fit_transform(frame.iloc[indices][list(contract.feature_columns)], y[indices])
    X, labels = _resample(X, y[indices], resampling, seed)
    fitted = clone(model).fit(X, labels)
    return prep, fitted


def train_model(csv_path: str | Path, contract: DatasetContract, output_dir: str | Path,
                *, test_size: float = 0.2, calibration_size: float = 0.15,
                folds: int = 5, resampling: str = "none", seed: int = 42,
                headerless: bool = False, column_names: list[str] | None = None):
    """Fit OOF base models/meta learner, calibrate on a disjoint calibration split.

    The test partition is used only once for reported metrics. The final bundle
    intentionally keeps the proper-training base estimators used by the fitted
    calibrator, avoiding a post-calibration refit that changes their outputs.
    """
    if headerless and not column_names:
        raise ValueError("column_names are required when reading a headerless CSV")
    raw = pd.read_csv(csv_path, header=None, names=column_names) if headerless else pd.read_csv(csv_path)
    frame = clean_frame(raw, contract)
    api_features = {"age", "gender", "pregnancies", "glucose", "blood_pressure", "skin_thickness", "insulin", "bmi",
                    "hba1c", "diabetes_pedigree_fn"}
    unsupported = set(contract.feature_columns) - api_features
    if unsupported:
        raise ValueError(f"Model features are not available in the current API contract: {sorted(unsupported)}")
    labels = LabelEncoder().fit(frame[contract.label_column].astype(str))
    y = labels.transform(frame[contract.label_column].astype(str))
    if contract.class_labels and tuple(labels.classes_) != tuple(contract.class_labels):
        raise ValueError(f"Observed labels {tuple(labels.classes_)} do not match configured class_labels")
    if contract.class_mapping:
        mapping = {str(key): value for key, value in contract.class_mapping.items()}
        if set(mapping) != set(labels.classes_) or not set(mapping.values()) <= {"Non-Diabetic", "Pre-Diabetic", "Diabetic"}:
            raise ValueError("class_mapping must cover all source labels and map only to the API classes")
        if len(set(mapping.values())) != len(mapping.values()):
            raise ValueError("class_mapping must map each source label to a unique API class")
    if contract.positive_label is not None and str(contract.positive_label) not in labels.classes_:
        raise ValueError("Configured positive_label does not occur in target column")
    idx = np.arange(len(frame))
    train_idx, test_idx = train_test_split(idx, test_size=test_size, stratify=y, random_state=seed)
    fit_idx, calibration_idx = train_test_split(train_idx, test_size=calibration_size,
                                                 stratify=y[train_idx], random_state=seed)
    if np.bincount(y[fit_idx]).min() < folds:
        raise ValueError("Each class needs at least folds examples in the proper training split")
    models = make_base_models(seed)
    oof = np.zeros((len(fit_idx), len(models) * len(labels.classes_)))
    splitter = StratifiedKFold(n_splits=folds, shuffle=True, random_state=seed)
    for fold, (tr, va) in enumerate(splitter.split(fit_idx, y[fit_idx])):
        actual_tr, actual_va = fit_idx[tr], fit_idx[va]
        for j, model in enumerate(models.values()):
            prep, fitted = _fit_fold(frame, contract, y, actual_tr, model, resampling, seed + fold)
            Xv = prep.transform(frame.iloc[actual_va][list(contract.feature_columns)])
            oof[va, j * len(labels.classes_):(j + 1) * len(labels.classes_)] = fitted.predict_proba(Xv)
    meta = MLPClassifier(hidden_layer_sizes=(32, 16), early_stopping=True,
                         max_iter=500, random_state=seed).fit(oof, y[fit_idx])
    final_bases = {}
    cal_features = []
    for name, model in models.items():
        prep, fitted = _fit_fold(frame, contract, y, fit_idx, model, resampling, seed)
        final_bases[name] = (prep, fitted)
        Xc = prep.transform(frame.iloc[calibration_idx][list(contract.feature_columns)])
        cal_features.append(fitted.predict_proba(Xc))
    cal_X = np.hstack(cal_features)
    calibrated = CalibratedClassifierCV(FrozenEstimator(meta), method="sigmoid", cv=2)
    if np.bincount(y[calibration_idx], minlength=len(labels.classes_)).min() < 2:
        raise ValueError("Calibration split needs at least two examples from every class")
    calibrated.fit(cal_X, y[calibration_idx])
    test_parts = []
    for prep, fitted in final_bases.values():
        test_parts.append(fitted.predict_proba(prep.transform(frame.iloc[test_idx][list(contract.feature_columns)])))
    probs = calibrated.predict_proba(np.hstack(test_parts))
    predicted = probs.argmax(axis=1)
    try:
        if len(labels.classes_) == 2:
            positive_index = (list(labels.classes_).index(str(contract.positive_label))
                              if contract.positive_label is not None
                              else next((i for i, name in enumerate(labels.classes_)
                                         if (contract.class_mapping or {}).get(name) == "Diabetic"), 1))
            auc = roc_auc_score(y[test_idx] == positive_index, probs[:, positive_index])
        else:
            auc = roc_auc_score(y[test_idx], probs, multi_class="ovr", average="macro")
    except ValueError:
        auc = None
    metrics = {"accuracy": float(accuracy_score(y[test_idx], predicted)),
               "balanced_accuracy": float(balanced_accuracy_score(y[test_idx], predicted)),
               "macro_f1": float(f1_score(y[test_idx], predicted, average="macro")),
               "multiclass_brier_score": float(np.mean(np.sum(
                   (probs - np.eye(len(labels.classes_))[y[test_idx]]) ** 2, axis=1))),
               "mcc": float(matthews_corrcoef(y[test_idx], predicted)),
               "log_loss": float(log_loss(y[test_idx], probs, labels=np.arange(len(labels.classes_)))),
               "roc_auc_ovr_macro": float(auc) if auc is not None else None,
               "test_rows": int(len(test_idx)), "classes": labels.classes_.tolist()}
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    bundle = {"bases": final_bases, "meta": calibrated, "classes": labels.classes_.tolist(),
              "class_mapping": contract.class_mapping,
              "features": list(contract.feature_columns), "label_column": contract.label_column,
              "zero_as_missing": list(contract.zero_as_missing),
              "explanation_background": frame.iloc[fit_idx][list(contract.feature_columns)].sample(
                  min(100, len(fit_idx)), random_state=seed).to_dict(orient="records"),
              "positive_label": str(contract.positive_label) if contract.positive_label is not None else None,
              "seed": seed, "resampling": resampling}
    artifact = output / "xai_hedl.joblib"
    joblib.dump(bundle, artifact)
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    metrics.update({"artifact": artifact.name, "artifact_sha256": digest,
                    "seed": seed, "resampling": resampling})
    (output / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics
