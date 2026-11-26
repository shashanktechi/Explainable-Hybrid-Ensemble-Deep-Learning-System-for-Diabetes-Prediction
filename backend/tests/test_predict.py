"""
Prediction tests — response shape, risk_band consistency, DB rows saved, stub determinism.
"""

import uuid


class TestPrediction:
    def _predict(self, client, headers, patient_id):
        return client.post(
            "/api/predict",
            headers=headers,
            json={
                "patient_id": str(patient_id),
                "glucose": 180.0,
                "blood_pressure": 85.0,
                "insulin": 150.0,
                "bmi": 32.0,
                "hba1c": 7.5,
                "pregnancies": 2,
                "skin_thickness": 30.0,
                "diabetes_pedigree_fn": 0.7,
            },
        )

    def test_predict_returns_exact_response_shape(self, client, auth_headers_doctor, sample_patient):
        response = self._predict(client, auth_headers_doctor, sample_patient.patient_id)
        assert response.status_code == 201
        data = response.json()

        for field in ["prediction_id", "record_id", "patient_id", "predicted_class",
                      "class_probabilities", "probability_score", "risk_score",
                      "risk_band", "model_version", "explanation", "recommendations", "created_at"]:
            assert field in data, f"Missing field: {field}"

        cp = data["class_probabilities"]
        assert set(cp.keys()) == {"Non-Diabetic", "Pre-Diabetic", "Diabetic"}
        assert abs(sum(cp.values()) - 1.0) < 0.01
        assert data["predicted_class"] in ("Non-Diabetic", "Pre-Diabetic", "Diabetic")
        assert 0 <= data["risk_score"] <= 100

        exp = data["explanation"]
        assert "shap_values" in exp and "lime_values" in exp and "top_features" in exp
        assert isinstance(exp["top_features"], list) and len(exp["top_features"]) >= 1

        recs = data["recommendations"]
        assert len(recs) == 3
        assert {r["category"] for r in recs} == {"diet", "lifestyle", "follow_up"}
        for r in recs:
            assert len(r["text"]) > 0

    def test_predict_risk_band_matches_risk_score(self, client, auth_headers_doctor, sample_patient):
        data = self._predict(client, auth_headers_doctor, sample_patient.patient_id).json()
        rs, rb = data["risk_score"], data["risk_band"]
        if rs <= 30:
            assert rb == "Low"
        elif rs <= 65:
            assert rb == "Moderate"
        else:
            assert rb == "High"

    def test_predict_saves_db_rows(self, client, auth_headers_doctor, sample_patient, db):
        from database.models.prediction import Prediction
        from database.models.explanation import Explanation
        from database.models.recommendation import Recommendation
        from database.models.audit_log import AuditLog

        response = self._predict(client, auth_headers_doctor, sample_patient.patient_id)
        assert response.status_code == 201
        pred_id = uuid.UUID(response.json()["prediction_id"])

        assert db.query(Prediction).filter(Prediction.prediction_id == pred_id).first() is not None
        assert db.query(Explanation).filter(Explanation.prediction_id == pred_id).first() is not None
        assert db.query(Recommendation).filter(Recommendation.prediction_id == pred_id).count() == 3
        assert db.query(AuditLog).filter(AuditLog.action == "ran_prediction").first() is not None

    def test_stub_predictor_is_deterministic(self):
        from backend.app.services.prediction_service import StubPredictor
        p = StubPredictor()
        features = {"glucose": 180, "bmi": 32, "hba1c": 7.5, "insulin": 150, "blood_pressure": 130}
        assert p.predict_proba(features) == p.predict_proba(features)

    def test_get_prediction(self, client, auth_headers_doctor, sample_patient):
        pred_id = self._predict(client, auth_headers_doctor, sample_patient.patient_id).json()["prediction_id"]
        get_resp = client.get(f"/api/predictions/{pred_id}", headers=auth_headers_doctor)
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["prediction_id"] == pred_id
        assert "class_probabilities" in data
        assert "explanation" in data
        assert "recommendations" in data
        assert set(data["class_probabilities"]) == {"Non-Diabetic", "Pre-Diabetic", "Diabetic"}

    def test_prediction_history_is_scoped_and_probabilities_are_persisted(self, client, auth_headers_doctor, sample_patient, db):
        from database.models.prediction import Prediction
        from backend.app.routes.auth_routes import create_access_token, hash_password
        from database.models.user import User

        result = self._predict(client, auth_headers_doctor, sample_patient.patient_id).json()
        stored = db.query(Prediction).filter(Prediction.prediction_id == uuid.UUID(result["prediction_id"])).one()
        assert stored.class_probabilities == result["class_probabilities"]
        assert stored.model_artifact_sha256 is None  # Demo stub has no serialized artifact.

        other = User(full_name="Other Doctor", email="other2@test.com",
                     password_hash=hash_password("Other@123"), role="doctor")
        db.add(other)
        db.commit()
        headers = {"Authorization": f"Bearer {create_access_token({'sub': str(other.user_id)})}"}
        detail = client.get(f"/api/predictions/{result['prediction_id']}", headers=headers)
        history = client.get("/api/predictions", headers=headers)
        assert detail.status_code == 404
        assert history.json()["total"] == 0

    def test_predict_nonexistent_patient_returns_404(self, client, auth_headers_doctor, doctor_user):
        response = client.post(
            "/api/predict",
            headers=auth_headers_doctor,
            json={
                "patient_id": "00000000-0000-0000-0000-000000000099",
                "glucose": 100.0, "blood_pressure": 80.0, "insulin": 50.0, "bmi": 25.0,
            },
        )
        assert response.status_code == 404

    def test_predict_invalid_glucose_zero(self, client, auth_headers_doctor, sample_patient):
        response = client.post(
            "/api/predict",
            headers=auth_headers_doctor,
            json={
                "patient_id": str(sample_patient.patient_id),
                "glucose": 0, "blood_pressure": 80.0, "insulin": 50.0, "bmi": 25.0,
            },
        )
        assert response.status_code == 422
