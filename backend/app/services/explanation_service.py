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


# Feature units for clinical narratives
_FEATURE_UNITS: dict[str, str] = {
    "glucose": "mg/dL",
    "bmi": "kg/m²",
    "hba1c": "%",
    "insulin": "μU/mL",
    "blood_pressure": "mmHg",
    "diabetes_pedigree_fn": "",
    "skin_thickness": "mm",
    "pregnancies": "",
    "age": "years",
}


def compute_top_features(shap_values: dict[str, float], n: int = 3) -> list[str]:
    """Top N features by absolute SHAP value."""
    sorted_feats = sorted(shap_values.items(), key=lambda x: abs(x[1]), reverse=True)
    return [feat for feat, _ in sorted_feats[:n]]


def _format_value_with_unit(feature_key: str, value: float | str | None) -> str:
    if value is None:
        return "not recorded"
    if isinstance(value, str):
        return value
    unit = _FEATURE_UNITS.get(feature_key, "")
    formatted = f"{value:g}"
    return f"{formatted} {unit}".strip()


def build_feature_narratives(
    shap_values: dict[str, float],
    lime_values: dict[str, float],
    features: dict,
    normal_ref: dict[str, float] = _NORMAL_REF,
    predicted_class: str = "Diabetic",
    top_features: list[str] | None = None,
) -> list[dict]:
    """Build plain-English clinical narratives for each top contributing feature."""
    ordered_top = top_features if top_features is not None else compute_top_features(shap_values)
    narratives: list[dict] = []

    for idx, key in enumerate(ordered_top):
        display_name = _FEATURE_NAMES.get(key, key.replace("_", " "))
        cap_name = display_name[:1].upper() + display_name[1:]
        actual = features.get(key)
        ref = normal_ref.get(key)

        if isinstance(actual, (int, float)) and ref is not None and ref != 0:
            diff_ratio = (float(actual) - float(ref)) / float(ref)
            if abs(diff_ratio) <= 0.05:
                direction = "within normal range"
            elif float(actual) > float(ref):
                direction = "above normal"
            else:
                direction = "below normal"
        else:
            diff_ratio = None
            direction = "within normal range"

        shap_val = float(shap_values.get(key, 0.0))
        has_lime = key in lime_values
        lime_val = float(lime_values.get(key, 0.0)) if has_lime else shap_val
        if shap_val == 0.0 and lime_val == 0.0:
            shap_lime_agree = True
        elif has_lime and (shap_val * lime_val <= 0):
            shap_lime_agree = False
        else:
            shap_lime_agree = True

        actual_str = _format_value_with_unit(key, actual)
        ref_str = _format_value_with_unit(key, ref) if ref is not None else None

        driver_phrase = (
            "was the strongest single driver"
            if idx == 0
            else "was a key contributing driver"
        )
        impact_phrase = (
            f"pushing this prediction toward {predicted_class}"
            if shap_val >= 0
            else f"pulling this prediction away from {predicted_class}"
        )

        if diff_ratio is not None and ref_str is not None:
            pct = abs(round(diff_ratio * 100))
            if direction == "above normal":
                comparison = f"{pct}% above the reference value of {ref_str}"
            elif direction == "below normal":
                comparison = f"{pct}% below the reference value of {ref_str}"
            else:
                comparison = f"within normal range relative to the reference value of {ref_str}"
            sentence = f"{cap_name} of {actual_str} is {comparison} and {driver_phrase} {impact_phrase}."
        else:
            sentence = f"{cap_name} ({actual_str}) {driver_phrase} {impact_phrase}."

        if not shap_lime_agree:
            sentence += (
                " Note: SHAP and LIME disagree on the direction of this feature's impact, "
                "so it should be weighted cautiously."
            )

        narratives.append({
            "feature_key": key,
            "feature": display_name,
            "actual_value": actual,
            "reference_value": ref,
            "direction": direction,
            "narrative": sentence,
            "shap_lime_agree": shap_lime_agree,
        })

    return narratives


def build_overall_narrative(
    predicted_class: str,
    probability_score: float,
    risk_band: str,
    feature_narratives: list[dict],
) -> str:
    """Summarize the prediction, confidence, risk band, and XAI agreement in one paragraph."""
    confidence_pct = round(float(probability_score) * 100)
    if not feature_narratives:
        return (
            f"This patient was classified as {predicted_class} with {confidence_pct}% confidence "
            f"({risk_band} risk band)."
        )

    descriptors = []
    for item in feature_narratives[:3]:
        name = item["feature"]
        if item["direction"] == "above normal":
            descriptors.append(f"elevated {name}")
        elif item["direction"] == "below normal":
            descriptors.append(f"reduced {name}")
        else:
            descriptors.append(name)

    if len(descriptors) == 1:
        drivers_text = descriptors[0]
    elif len(descriptors) == 2:
        drivers_text = f"{descriptors[0]} and {descriptors[1]}"
    else:
        drivers_text = f"{', '.join(descriptors[:-1])}, and {descriptors[-1]}"

    all_agree = all(item.get("shap_lime_agree", True) for item in feature_narratives)
    agreement_clause = (
        "each confirmed by both SHAP and LIME"
        if all_agree
        else "though SHAP and LIME diverge on at least one top feature (review individual drivers with caution)"
    )

    return (
        f"This patient was classified as {predicted_class} with {confidence_pct}% confidence "
        f"({risk_band} risk band), driven primarily by {drivers_text}, {agreement_clause}."
    )


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
