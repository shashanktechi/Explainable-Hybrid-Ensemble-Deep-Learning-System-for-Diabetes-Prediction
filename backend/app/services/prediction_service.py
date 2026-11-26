"""
Prediction service — stub and persisted ensemble artifact implementations.

The local Pima artifact is exploratory only. Production model selection remains
an explicit deployment configuration decision.
"""

from abc import ABC, abstractmethod

from backend.app.config import settings
from backend.app.utils.logger import get_logger
from pathlib import Path
import hashlib

logger = get_logger(__name__)


class Predictor(ABC):
    """Abstract interface for the prediction model."""

    @abstractmethod
    def predict_proba(self, features: dict) -> dict[str, float]:
        """
        Return class probabilities for 3 classes summing to 1.0:
            {"Non-Diabetic": float, "Pre-Diabetic": float, "Diabetic": float}
        """
        ...


class StubPredictor(Predictor):
    """
    Deterministic, rule-based predictor.
    Higher glucose / bmi / hba1c => higher Diabetic probability.
    Same input always produces the same output.
    """

    # Reference "normal" values for scoring
    _NORMAL = {
        "glucose": 100.0,
        "bmi": 25.0,
        "hba1c": 5.7,
        "insulin": 80.0,
        "blood_pressure": 120.0,
        "diabetes_pedigree_fn": 0.5,
        "skin_thickness": 20.0,
        "pregnancies": 1.0,
    }

    # Feature weights (how much each feature contributes to risk)
    _WEIGHTS = {
        "glucose": 0.35,
        "bmi": 0.20,
        "hba1c": 0.20,
        "insulin": 0.08,
        "blood_pressure": 0.07,
        "diabetes_pedigree_fn": 0.05,
        "skin_thickness": 0.02,
        "pregnancies": 0.03,
    }

    def predict_proba(self, features: dict) -> dict[str, float]:
        # Compute a weighted risk score from how far each value is above normal
        risk = 0.0
        for key, weight in self._WEIGHTS.items():
            value = features.get(key)
            if value is None:
                continue
            normal = self._NORMAL[key]
            # Ratio above normal contributes positively; below contributes negatively
            deviation = (value - normal) / normal
            risk += weight * deviation

        # Clamp risk to [-1, 1] then map to probabilities
        risk = max(-1.0, min(1.0, risk))

        # Map risk to class probabilities
        if risk <= -0.3:
            p_diabetic = 0.05
            p_prediabetic = 0.15
        elif risk <= 0.0:
            p_diabetic = 0.05 + (risk + 0.3) * (0.15 / 0.3)
            p_prediabetic = 0.15 + (risk + 0.3) * (0.20 / 0.3)
        elif risk <= 0.3:
            p_diabetic = 0.20 + risk * (0.30 / 0.3)
            p_prediabetic = 0.35 + risk * (0.15 / 0.3)
        else:
            p_diabetic = 0.50 + (risk - 0.3) * (0.45 / 0.7)
            p_prediabetic = 0.50 - (risk - 0.3) * (0.30 / 0.7)

        # Clamp
        p_diabetic = max(0.0, min(1.0, p_diabetic))
        p_prediabetic = max(0.0, min(1.0, p_prediabetic))
        p_nondiabetic = max(0.0, 1.0 - p_diabetic - p_prediabetic)

        # Normalize so they sum to exactly 1
        total = p_nondiabetic + p_prediabetic + p_diabetic
        p_prediabetic = round(p_prediabetic / total, 6)
        p_diabetic = round(p_diabetic / total, 6)
        # Compute the residual class after rounding the other two classes so
        # serialization cannot produce a probability vector that fails the
        # API's normalization check.
        p_nondiabetic = round(1.0 - p_prediabetic - p_diabetic, 6)
        return {
            "Non-Diabetic": p_nondiabetic,
            "Pre-Diabetic": p_prediabetic,
            "Diabetic": p_diabetic,
        }


class RealPredictor(Predictor):
    def __init__(self) -> None:
        from ml.predict import EnsemblePredictor
        self._model = EnsemblePredictor(settings.model_artifact_path)
        self.classes = self._model.classes
        self.artifact_sha256 = hashlib.sha256(Path(settings.model_artifact_path).read_bytes()).hexdigest()
        self.version = settings.model_version

    def predict_proba(self, features: dict) -> dict[str, float]:
        return self._model.predict_proba(features)

    def explain(self, features: dict):
        return self._model.explain(features)


def get_predictor() -> Predictor:
    """Factory — returns the appropriate predictor based on config."""
    if settings.use_stub_model:
        logger.info("Using StubPredictor (USE_STUB_MODEL=true)")
        return StubPredictor()
    else:
        logger.info("Loading model artifact from %s", settings.model_artifact_path)
        return RealPredictor()


# Singleton — loaded once at import time (not per request)
predictor = get_predictor()
