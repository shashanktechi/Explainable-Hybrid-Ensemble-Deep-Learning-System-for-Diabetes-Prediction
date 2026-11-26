import pandas as pd
import pytest

from ml.preprocessing import DatasetContract, clean_frame, make_preprocessor


def test_contract_requires_explicit_existing_columns():
    frame = pd.DataFrame({"glucose": [90, 120], "Outcome": [0, 1]})
    DatasetContract("Outcome", ("glucose",)).validate(frame)
    with pytest.raises(ValueError, match="missing"):
        DatasetContract("Outcome", ("age",)).validate(frame)


def test_cleaning_handles_infinity_and_deduplicates():
    frame = pd.DataFrame({"x": [1.0, 1.0, float("inf"), 3.0], "target": [0, 0, 1, 1]})
    cleaned = clean_frame(frame, DatasetContract("target", ("x",)))
    assert len(cleaned) == 3
    assert pd.isna(cleaned.loc[1, "x"])


def test_feature_mapping_renames_source_columns_explicitly():
    frame = pd.DataFrame({"Glucose": [90, 120], "Outcome": [0, 1]})
    contract = DatasetContract("Outcome", ("glucose",), feature_mapping={"Glucose": "glucose"})
    cleaned = clean_frame(frame, contract)
    assert list(cleaned.columns) == ["glucose", "Outcome"]


def test_explicit_zero_missing_mapping():
    frame = pd.DataFrame({"glucose": [0, 120], "Outcome": [0, 1]})
    cleaned = clean_frame(frame, DatasetContract("Outcome", ("glucose",), zero_as_missing=("glucose",)))
    assert pd.isna(cleaned.loc[0, "glucose"])


def test_preprocessor_fits_and_selects_training_features():
    frame = pd.DataFrame({"x": [1.0, 2.0, None, 4.0], "group": ["a", "b", "a", "b"]})
    prep = make_preprocessor(frame, ("x", "group")).fit(frame, [0, 1, 0, 1])
    transformed = prep.transform(frame)
    assert transformed.shape[0] == 4
    assert transformed.shape[1] >= 1
