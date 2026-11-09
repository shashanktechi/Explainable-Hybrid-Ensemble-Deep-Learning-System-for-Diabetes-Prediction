"""
Biological plausibility validators — reject impossible clinical values.
Returns a list of error messages; empty list means valid.
"""


def validate_clinical_input(data: dict) -> list[str]:
    """
    Validate clinical input values for biological plausibility.
    `data` keys match the API request fields.
    Returns list of error messages (empty = valid).
    """
    errors: list[str] = []

    # glucose: > 0 and <= 600 (mg/dL) — required
    glucose = data.get("glucose")
    if glucose is not None:
        if glucose <= 0:
            errors.append("glucose must be greater than 0 (received 0 or negative)")
        elif glucose > 600:
            errors.append("glucose must be <= 600 mg/dL")

    # blood_pressure: > 0 and <= 250 — required
    bp = data.get("blood_pressure")
    if bp is not None:
        if bp <= 0:
            errors.append("blood_pressure must be greater than 0")
        elif bp > 250:
            errors.append("blood_pressure must be <= 250 mmHg")

    # bmi: > 0 and <= 80 — required
    bmi = data.get("bmi")
    if bmi is not None:
        if bmi <= 0:
            errors.append("bmi must be greater than 0 (received 0 or negative)")
        elif bmi > 80:
            errors.append("bmi must be <= 80")

    # insulin: >= 0 and <= 1000 — required
    insulin = data.get("insulin")
    if insulin is not None:
        if insulin < 0:
            errors.append("insulin must be >= 0")
        elif insulin > 1000:
            errors.append("insulin must be <= 1000 µU/mL")

    # pregnancies: null or 0 <= x <= 20
    pregnancies = data.get("pregnancies")
    if pregnancies is not None:
        if pregnancies < 0 or pregnancies > 20:
            errors.append("pregnancies must be between 0 and 20")

    # skin_thickness: null or 0 < x <= 100
    skin = data.get("skin_thickness")
    if skin is not None:
        if skin <= 0:
            errors.append("skin_thickness must be greater than 0")
        elif skin > 100:
            errors.append("skin_thickness must be <= 100 mm")

    # hba1c: null or 3 <= x <= 20
    hba1c = data.get("hba1c")
    if hba1c is not None:
        if hba1c < 3 or hba1c > 20:
            errors.append("hba1c must be between 3.0 and 20.0 %")

    # diabetes_pedigree_fn: null or 0 <= x <= 3
    dpf = data.get("diabetes_pedigree_fn")
    if dpf is not None:
        if dpf < 0 or dpf > 3:
            errors.append("diabetes_pedigree_fn must be between 0 and 3")

    return errors


def validate_patient_demographics(age: int, gender: str) -> list[str]:
    """Validate patient demographic fields."""
    errors: list[str] = []

    if age < 1 or age > 120:
        errors.append("age must be between 1 and 120")

    if gender not in ("M", "F", "Other"):
        errors.append("gender must be 'M', 'F', or 'Other'")

    return errors
