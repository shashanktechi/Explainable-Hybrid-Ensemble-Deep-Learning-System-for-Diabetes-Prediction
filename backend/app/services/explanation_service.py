"""
Explanation service — SHAP/LIME stubs + rule-based recommendations.

# STUB — replace with real xai/shap_explainer.py, xai/lime_explainer.py
#        and xai/recommendation_engine.py later without changing routes
#        or response shape.
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


def compute_shap_values(features: dict) -> dict[str, float]:
    """
    # STUB — replace with real SHAP in xai/shap_explainer.py
    Deterministic per-feature contributions derived from how far each input
    is from a normal reference value. Only includes features that were provided.
    """
    shap: dict[str, float] = {}
    for key, normal in _NORMAL_REF.items():
        value = features.get(key)
        if value is None:
            continue
        # Contribution proportional to deviation from normal
        contribution = (value - normal) / normal
        shap[key] = round(contribution * 0.3, 4)  # scaled factor
    return shap


def compute_lime_values(features: dict) -> dict[str, float]:
    """
    # STUB — replace with real LIME in xai/lime_explainer.py
    Similar to SHAP but with slightly different scaling (simulating LIME).
    """
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
    # STUB — replace with real xai/recommendation_engine.py
    Rule-based, one per category (diet, lifestyle, follow_up).
    Text depends on risk_band and top_features.
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
    """Generate diet recommendation based on risk and top features."""
    if "glucose" in top_features and features.get("glucose", 0) > 140:
        base = "Reduce refined sugar and simple carbohydrates. Focus on low-glycemic foods."
    elif "bmi" in top_features and features.get("bmi", 0) > 30:
        base = "Adopt a calorie-controlled diet rich in vegetables, lean proteins, and whole grains."
    elif "hba1c" in top_features:
        base = "Maintain consistent meal timing and reduce processed food intake to stabilize blood sugar."
    else:
        base = "Follow a balanced diet with adequate fiber, lean protein, and healthy fats."

    if risk_band == "High":
        base += " Consider consulting a registered dietitian for a personalized meal plan."
    elif risk_band == "Moderate":
        base += " Monitor carbohydrate intake and prefer complex carbohydrates."

    return base


def _lifestyle_recommendation(risk_band: str, top_features: list[str], features: dict) -> str:
    """Generate lifestyle recommendation."""
    if risk_band == "High":
        return (
            "Engage in at least 150 minutes of moderate aerobic activity per week. "
            "Monitor blood glucose levels daily and maintain a health journal."
        )
    elif risk_band == "Moderate":
        return (
            "Aim for 30 minutes of moderate exercise most days of the week. "
            "Maintain a healthy weight and manage stress through relaxation techniques."
        )
    else:
        return (
            "Continue regular physical activity and maintain a healthy lifestyle. "
            "Annual health check-ups are recommended."
        )


def _followup_recommendation(risk_band: str, top_features: list[str]) -> str:
    """Generate follow-up recommendation."""
    if risk_band == "High":
        return (
            "Consult an endocrinologist within 1-2 weeks. "
            "Schedule an HbA1c test and comprehensive metabolic panel. "
            "Consider referral for diabetes education program."
        )
    elif risk_band == "Moderate":
        return (
            "Schedule a follow-up appointment within 1 month. "
            "Repeat fasting glucose and HbA1c tests in 3 months."
        )
    else:
        return (
            "Routine follow-up in 6-12 months. "
            "Continue annual diabetes screening as recommended."
        )
