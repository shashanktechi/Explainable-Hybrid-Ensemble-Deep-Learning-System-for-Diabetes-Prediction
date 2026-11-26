"""Model explanation dispatch and non-prescriptive recommendation text.

Trained predictors provide genuine model-agnostic SHAP/LIME values. The demo
stub path returns clearly labeled heuristic values for UI/API development.
"""


# Reference "normal" values — same as in StubPredictor
_NORMAL_REF: dict[str, float] = {
    "glucose": 100.0,
    "bmi": 25.0,
    "hba1c": 5.7,
    "insulin": 80.0,
    "blood_pressure": 120.0,
    "diabetes_pedigree_fn": 0.5,
    "skin_thickness": 20.0,
    "pregnancies": 1.0,
}

# Feature display names for recommendations
_FEATURE_NAMES: dict[str, str] = {
    "glucose": "blood glucose",
    "bmi": "BMI",
    "hba1c": "HbA1c",
    "insulin": "insulin",
    "blood_pressure": "blood pressure",
    "diabetes_pedigree_fn": "diabetes pedigree function",
    "skin_thickness": "skin thickness",
    "pregnancies": "pregnancy count",
}


def compute_shap_values(features: dict, model=None) -> dict[str, float]:
    """
    Heuristic demo contribution used only with the explicit stub predictor.
    """
    if model is not None and hasattr(model, "explain"):
        return model.explain(features)[0]
    shap: dict[str, float] = {}
    for key, normal in _NORMAL_REF.items():
        value = features.get(key)
        if value is None:
            continue
        # Contribution proportional to deviation from normal
        contribution = (value - normal) / normal
        shap[key] = round(contribution * 0.3, 4)  # scaled factor
    return shap


def compute_lime_values(features: dict, model=None) -> dict[str, float]:
    """
    Heuristic demo contribution used only with the explicit stub predictor.
    """
    if model is not None and hasattr(model, "explain"):
        return model.explain(features)[1]
    lime: dict[str, float] = {}
    for key, normal in _NORMAL_REF.items():
        value = features.get(key)
        if value is None:
            continue
        contribution = (value - normal) / normal
        lime[key] = round(contribution * 0.25, 4)  # different scale from SHAP
    return lime


def compute_top_features(shap_values: dict[str, float], n: int = 3) -> list[str]:
    """Top N features by absolute SHAP value."""
    sorted_feats = sorted(shap_values.items(), key=lambda x: abs(x[1]), reverse=True)
    return [feat for feat, _ in sorted_feats[:n]]


def generate_recommendations(
    risk_band: str,
    top_features: list[str],
    features: dict,
) -> list[dict[str, str]]:
    """
    Non-prescriptive discussion prompts, one per category.
    """
    recommendations: list[dict[str, str]] = []

    # --- Diet recommendation ---
    diet_text = _diet_recommendation(risk_band, top_features, features)
    recommendations.append({"category": "diet", "text": diet_text})

    # --- Lifestyle recommendation ---
    lifestyle_text = _lifestyle_recommendation(risk_band, top_features, features)
    recommendations.append({"category": "lifestyle", "text": lifestyle_text})

    # --- Follow-up recommendation ---
    followup_text = _followup_recommendation(risk_band, top_features)
    recommendations.append({"category": "follow_up", "text": followup_text})

    return recommendations


def _diet_recommendation(risk_band: str, top_features: list[str], features: dict) -> str:
    """Offer a feature-personalized, non-prescriptive discussion point."""
    focus = ", ".join(top_features[:2]).replace("_", " ") or "the reported measurements"
    return (f"For this {risk_band.lower()} application band, review {focus} with a qualified clinician or dietitian "
            "when discussing whether nutrition changes are appropriate. These model drivers are associations, not causes.")


def _lifestyle_recommendation(risk_band: str, top_features: list[str], features: dict) -> str:
    """Avoid inferring activity needs from lab inputs the model did not collect."""
    focus = ", ".join(top_features[:2]).replace("_", " ") or "the reported measurements"
    return (f"This {risk_band.lower()} band and {focus} do not describe daily activity, medications, or personal barriers. "
            "Ask the care team which lifestyle goals, if any, are safe and relevant.")


def _followup_recommendation(risk_band: str, top_features: list[str]) -> str:
    """Leave test selection and follow-up timing to the treating clinician."""
    focus = ", ".join(top_features[:2]).replace("_", " ") or "these results"
    band = risk_band.lower()
    return f"Ask a qualified clinician to interpret this {band} application band and {focus} with the patient's history and decide whether further evaluation or follow-up is appropriate."
