"""
Validator tests — reject biologically impossible values.
"""

from backend.app.utils.validators import validate_clinical_input


class TestValidators:
    def test_glucose_zero_rejected(self):
        errors = validate_clinical_input({"glucose": 0, "bmi": 25, "insulin": 50, "blood_pressure": 120})
        assert any("glucose" in e.lower() for e in errors)

    def test_bmi_zero_rejected(self):
        errors = validate_clinical_input({"glucose": 100, "bmi": 0, "insulin": 50, "blood_pressure": 120})
        assert any("bmi" in e.lower() for e in errors)

    def test_hba1c_25_rejected(self):
        errors = validate_clinical_input({"glucose": 100, "bmi": 25, "insulin": 50, "blood_pressure": 120, "hba1c": 25})
        assert any("hba1c" in e.lower() for e in errors)

    def test_valid_input_passes(self):
        errors = validate_clinical_input({
            "glucose": 120,
            "bmi": 28,
            "insulin": 100,
            "blood_pressure": 80,
            "hba1c": 6.5,
            "pregnancies": 2,
            "skin_thickness": 30,
            "diabetes_pedigree_fn": 0.5,
        })
        assert errors == []

    def test_pregnancies_out_of_range(self):
        errors = validate_clinical_input({"glucose": 100, "bmi": 25, "insulin": 50, "blood_pressure": 120, "pregnancies": 25})
        assert any("pregnancies" in e.lower() for e in errors)

    def test_insulin_negative_rejected(self):
        errors = validate_clinical_input({"glucose": 100, "bmi": 25, "insulin": -10, "blood_pressure": 120})
        assert any("insulin" in e.lower() for e in errors)

    def test_skin_thickness_zero_rejected(self):
        errors = validate_clinical_input({"glucose": 100, "bmi": 25, "insulin": 50, "blood_pressure": 120, "skin_thickness": 0})
        assert any("skin_thickness" in e.lower() for e in errors)

    def test_dpf_out_of_range(self):
        errors = validate_clinical_input({"glucose": 100, "bmi": 25, "insulin": 50, "blood_pressure": 120, "diabetes_pedigree_fn": 5})
        assert any("diabetes_pedigree_fn" in e.lower() for e in errors)

    def test_null_optional_fields_pass(self):
        errors = validate_clinical_input({
            "glucose": 100,
            "bmi": 25,
            "insulin": 50,
            "blood_pressure": 120,
            "pregnancies": None,
            "skin_thickness": None,
            "hba1c": None,
            "diabetes_pedigree_fn": None,
        })
        assert errors == []
