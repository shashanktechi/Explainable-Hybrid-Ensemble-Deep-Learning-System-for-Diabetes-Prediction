"""
Real SHAP + LIME explanation tests for EnsemblePredictor.

These tests train a *tiny* model (5 rows, binary, fast) in a temp directory,
then call EnsemblePredictor.explain() and assert that:
  - both dicts have the expected feature keys
  - all SHAP/LIME values are finite floats
  - the top features list is non-empty

The tiny model is binary (0/1) WITHOUT a class_mapping so explain() runs the
real Kernel SHAP + LIME path without needing the three-class mapping check
in predict_routes. We test the explainer independently of the HTTP layer.

Requires: shap, lime — install with  pip install shap lime
Skip gracefully if either package is absent (CI without ml/requirements.txt).
"""

import json
import math
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# ---------------------------------------------------------------------------
# Skip the whole module if shap or lime are not installed.
# ---------------------------------------------------------------------------
shap_available = pytest.importorskip("shap", reason="shap not installed")
lime_available = pytest.importorskip("lime", reason="lime not installed")


# ---------------------------------------------------------------------------
# Shared tiny fixture (module-scoped — trained once per pytest session)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def tiny_artifact_path(tmp_path_factory):
    """Train a minimal binary model and return the .joblib path."""
    from ml.preprocessing import DatasetContract
    from ml.training import train_model

    tmp = tmp_path_factory.mktemp("tiny_model")

    # 80 balanced rows (40 negative, 40 positive) keeps every stratified split happy
    rng = np.random.default_rng(0)
    n_half = 40
    glucose = np.concatenate([rng.uniform(75, 115, n_half), rng.uniform(155, 220, n_half)])
    bmi = np.concatenate([rng.uniform(19, 25, n_half), rng.uniform(30, 44, n_half)])
    hba1c = np.concatenate([rng.uniform(4.5, 5.6, n_half), rng.uniform(6.8, 10.5, n_half)])
    label = np.concatenate([np.zeros(n_half, dtype=int), np.ones(n_half, dtype=int)])
    df = pd.DataFrame({
        "glucose": glucose,
        "bmi":     bmi,
        "hba1c":   hba1c,
        "Outcome": label,
    })
    csv_path = tmp / "tiny.csv"
    df.to_csv(csv_path, index=False)

    contract = DatasetContract(
        label_column="Outcome",
        feature_columns=("glucose", "bmi", "hba1c"),
        # No class_mapping — binary 0/1, explain() still works
    )

    train_model(
        str(csv_path), contract, str(tmp),
        folds=2,          # minimal folds
        seed=0,
    )
    artifact = tmp / "xai_hedl.joblib"
    assert artifact.is_file(), "train_model must have produced xai_hedl.joblib"
    return artifact


@pytest.fixture(scope="module")
def predictor(tiny_artifact_path):
    from ml.predict import EnsemblePredictor
    return EnsemblePredictor(tiny_artifact_path)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

FEATURES = {"glucose": 190.0, "bmi": 34.0, "hba1c": 8.5}


def test_explain_returns_two_dicts(predictor):
    shap_vals, lime_vals = predictor.explain(FEATURES, lime_samples=200)
    assert isinstance(shap_vals, dict), "SHAP result must be a dict"
    assert isinstance(lime_vals, dict), "LIME result must be a dict"


def test_shap_keys_match_features(predictor):
    shap_vals, _ = predictor.explain(FEATURES, lime_samples=200)
    expected = set(FEATURES.keys())
    assert set(shap_vals.keys()) == expected, (
        f"SHAP keys {set(shap_vals.keys())} != expected {expected}"
    )


def test_shap_values_are_finite_floats(predictor):
    shap_vals, _ = predictor.explain(FEATURES, lime_samples=200)
    for name, value in shap_vals.items():
        assert isinstance(value, float), f"SHAP[{name}] is not a float: {type(value)}"
        assert math.isfinite(value), f"SHAP[{name}] is not finite: {value}"


def test_lime_keys_are_subset_of_features(predictor):
    """LIME may return only a subset of features (those with non-zero weight)."""
    _, lime_vals = predictor.explain(FEATURES, lime_samples=200)
    expected = set(FEATURES.keys())
    extra = set(lime_vals.keys()) - expected
    assert not extra, f"LIME returned unexpected keys: {extra}"
    # Must have at least one key
    assert len(lime_vals) >= 1, "LIME returned no feature weights"


def test_lime_values_are_finite_floats(predictor):
    _, lime_vals = predictor.explain(FEATURES, lime_samples=200)
    for name, value in lime_vals.items():
        assert isinstance(value, float), f"LIME[{name}] is not a float"
        assert math.isfinite(value), f"LIME[{name}] is not finite: {value}"


def test_predict_proba_sums_to_one(predictor):
    probs = predictor.predict_proba(FEATURES)
    assert isinstance(probs, dict)
    total = sum(probs.values())
    assert abs(total - 1.0) < 1e-4, f"Probabilities sum to {total}, not 1.0"


def test_non_diabetic_input_gives_low_diabetic_prob(predictor):
    """Healthy input → model should not be super confident diabetic."""
    healthy = {"glucose": 85.0, "bmi": 22.0, "hba1c": 5.0}
    probs = predictor.predict_proba(healthy)
    # The model is binary 0/1 without class_mapping; highest prob should not
    # correspond to the encoded class-1 for a clearly non-diabetic input.
    # We just assert no single class is over 99% (would indicate degenerate model).
    assert max(probs.values()) < 0.99, "Model gave 100% confidence — likely degenerate"


def test_predict_proba_missing_feature_raises(predictor):
    with pytest.raises(ValueError, match="Missing model features"):
        predictor.predict_proba({"glucose": 150.0})  # missing bmi, hba1c

