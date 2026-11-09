"""
Risk score service — converts probability to 0-100 score + band.
"""


def compute_probability_score(class_probabilities: dict[str, float]) -> float:
    """
    probability_score = P(Diabetic) + 0.5 * P(Pre-Diabetic), clipped to [0, 1].
    Keep this formula in one function so it can be changed later.
    """
    p_diabetic = class_probabilities.get("Diabetic", 0.0)
    p_prediabetic = class_probabilities.get("Pre-Diabetic", 0.0)
    score = p_diabetic + 0.5 * p_prediabetic
    return max(0.0, min(1.0, score))


def compute_risk_score(probability_score: float) -> int:
    """risk_score = round(probability_score * 100), clamped to [0, 100]."""
    return max(0, min(100, round(probability_score * 100)))


def compute_risk_band(risk_score: int) -> str:
    """
    Low = 0-30, Moderate = 31-65, High = 66-100.
    """
    if risk_score <= 30:
        return "Low"
    elif risk_score <= 65:
        return "Moderate"
    else:
        return "High"
