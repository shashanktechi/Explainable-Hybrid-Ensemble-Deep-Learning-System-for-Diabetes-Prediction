"""Dataset contracts and fold-fitted preprocessing for tabular clinical data."""

from dataclasses import dataclass
from typing import Sequence

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.feature_selection import SelectFromModel
from sklearn.ensemble import ExtraTreesClassifier


@dataclass(frozen=True)
class DatasetContract:
    """Explicit input mapping; no dataset columns or target are guessed."""

    label_column: str
    feature_columns: tuple[str, ...]
    positive_label: str | int | float | None = None
    class_labels: tuple[str, ...] | None = None
    class_mapping: dict[str, str] | None = None
    feature_mapping: dict[str, str] | None = None
    zero_as_missing: tuple[str, ...] = ()

    def validate(self, frame: pd.DataFrame) -> None:
        if not self.label_column or not self.feature_columns:
            raise ValueError("label_column and at least one feature_column are required")
        if len(set(self.feature_columns)) != len(self.feature_columns):
            raise ValueError("feature_columns must be unique")
        source_for = {canonical: source for source, canonical in (self.feature_mapping or {}).items()}
        if self.feature_mapping and len(set(self.feature_mapping.values())) != len(self.feature_mapping):
            raise ValueError("feature_mapping must map source columns to unique canonical feature names")
        if self.feature_mapping and set(self.feature_mapping.values()) != set(self.feature_columns):
            raise ValueError("feature_mapping must map exactly the configured feature_columns")
        missing = sorted(set((*[source_for.get(c, c) for c in self.feature_columns], self.label_column)) - set(frame.columns))
        if missing:
            raise ValueError(f"Dataset is missing explicitly configured columns: {missing}")
        if frame[self.label_column].isna().any():
            raise ValueError("Target column contains missing labels; resolve them explicitly")
        if frame[self.label_column].nunique() < 2:
            raise ValueError("At least two target classes are required")


def _categorical_columns(frame: pd.DataFrame, columns: Sequence[str]) -> list[str]:
    return [c for c in columns if not pd.api.types.is_numeric_dtype(frame[c])]


def make_preprocessor(frame: pd.DataFrame, feature_columns: Sequence[str], *, select_features: bool = True):
    """Return unfitted imputation/scaling/mapping and optional Extra Trees selection.

    The returned object must be fit only on a training partition. It deliberately
    contains no resampling; callers apply resampling to transformed training rows.
    """
    numeric = [c for c in feature_columns if c not in _categorical_columns(frame, feature_columns)]
    categorical = [c for c in feature_columns if c not in numeric]
    transforms = []
    if numeric:
        transforms.append(("numeric", Pipeline([
            ("impute", SimpleImputer(strategy="median", add_indicator=True)),
            ("scale", StandardScaler()),
        ]), numeric))
    if categorical:
        transforms.append(("categorical", Pipeline([
            ("impute", SimpleImputer(strategy="most_frequent")),
            ("encode", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]), categorical))
    steps = [("map", ColumnTransformer(transforms, remainder="drop", verbose_feature_names_out=False))]
    if select_features:
        steps.append(("select", SelectFromModel(
            ExtraTreesClassifier(n_estimators=256, class_weight="balanced", random_state=42, n_jobs=-1),
            threshold="median",
        )))
    return Pipeline(steps)


def clean_frame(frame: pd.DataFrame, contract: DatasetContract) -> pd.DataFrame:
    """Basic deterministic cleaning without using target statistics."""
    contract.validate(frame)
    source_for = {canonical: source for source, canonical in (contract.feature_mapping or {}).items()}
    source_columns = [source_for.get(column, column) for column in contract.feature_columns]
    result = frame.loc[:, [*source_columns, contract.label_column]].copy()
    result = result.rename(columns={source: canonical for canonical, source in source_for.items()})
    result = result.replace([np.inf, -np.inf], np.nan)
    for column in contract.zero_as_missing:
        if column not in contract.feature_columns:
            raise ValueError(f"zero_as_missing column is not a configured feature: {column}")
        result[column] = result[column].mask(result[column] == 0, np.nan)
    result = result.drop_duplicates().reset_index(drop=True)
    if result.empty:
        raise ValueError("No rows remain after removing duplicate records")
    return result
