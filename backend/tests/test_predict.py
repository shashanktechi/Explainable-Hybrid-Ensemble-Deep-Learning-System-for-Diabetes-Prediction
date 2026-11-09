"""
Prediction tests — response shape, risk_band consistency, DB rows saved,
stub determinism.
"""

import uuid


class TestPrediction:
    def _predict(self, client, headers, patient_id):
        """Helper to run a prediction."""
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

    def test_predict_returns_exact_response_shape(
        self, client, auth_headers_doctor, sample_patient
    ):
        response = self._predict(
            client, auth_headers_doctor, sample_patient.patient_id
        )
        assert response.status_code == 201
        data = response.json()

        # Check all required top-level fields
        assert "prediction_id" in data
        assert "record_id" in data
        assert "patient_id" in data
        assert "predicted_class" in data
        assert "class_probabilities" in data
        assert "probability_score" in data
        assert "risk_score" in data
        assert "risk_band" in data
        assert "model_version" in data
        assert "explanation" in data
        assert "recommendations" in data
        assert "created_at" in data

        # class_probabilities has 3 keys summing to ~1
        cp = data["class_probabilities"]
        assert set(cp.keys()) == {"Non-Diabetic", "Pre-Diabetic", "Diabetic"}
        assert abs(sum(cp.values()) - 1.0) < 0.01

        # predicted_class is one of the valid values
        assert data["predicted_class"] in ("Non-Diabetic", "Pre-Diabetic", "Diabetic")

        # risk_score is 0-100
        assert 0 <= data["risk_score"] <= 100

        # risk_band matches risk_score
        rs = data["risk_score"]
        if rs <= 30:
            assert data["risk_band"] == "Low"
        elif rs <= 65:
            assert data["risk_band"] == "Moderate"
        else:
            assert data["risk_band"] == "High"

        # explanation has the right structure
        exp = data["explanation"]
        assert "shap_values" in exp
        assert "lime_values" in exp
        assert "top_features" in exp
        assert isinstance(exp["top_features"], list)
        assert len(exp["top_features"]) >= 1

        # recommendations
        recs = data["recommendations"]
        assert len(recs) == 3
        categories = {r["category"] for r in recs}
        assert categories == {"diet", "lifestyle", "follow_up"}
        for r in recs:
            assert "text" in r
            assert len(r["text"]) > 0

    def test_predict_risk_band_matches_risk_score(
        self, client, auth_headers_doctor, sample_patient
    ):
        """Verify the risk_band is consistent with risk_score."""
        response = self._predict(
            client, auth_headers_doctor, sample_patient.patient_id
        )
        data = response.json()
        rs = data["risk_score"]
        rb = data["risk_band"]

        if rs <= 30:
            assert rb == "Low"
        elif rs <= 65:
            assert rb == "Moderate"
        else:
            assert rb == "High"

    def test_predict_saves_db_rows(
        self, client, auth_headers_doctor, sample_patient, db
    ):
        """Verify prediction creates rows in predictions, explanations, recommendations, audit_log."""
        from database.models.prediction import Prediction
        from database.models.explanation import Explanation
        from database.models.recommendation import Recommendation
        from database.models.audit_log import AuditLog

        response = self._predict(
            client, auth_headers_doctor, sample_patient.patient_id
        )
        assert response.status_code == 201
        pred_id = uuid.UUID(response.json()["prediction_id"])

        # Refresh session to see committed data
        db.expire_all()

        pred = db.query(Prediction).filter(Prediction.prediction_id == pred_id).first()
        assert pred is not None

        expl = db.query(Explanation).filter(Explanation.prediction_id == pred_id).first()
        assert expl is not None
        assert expl.shap_values is not None

        recs = db.query(Recommendation).filter(Recommendation.prediction_id == pred_id).all()
        assert len(recs) == 3

        audit = db.query(AuditLog).filter(AuditLog.action == "ran_prediction").first()
        assert audit is not None

    def test_stub_predictor_is_deterministic(self):
        """Same features produce the same output."""
        from backend.app.services.prediction_service import StubPredictor

        p = StubPredictor()
        features = {
            "glucose": 180,
            "bmi": 32,
            "hba1c": 7.5,
            "insulin": 150,
            "blood_pressure": 130,
        }
        result1 = p.predict_proba(features)
        result2 = p.predict_proba(features)
        assert result1 == result2

    def test_get_prediction(self, client, auth_headers_doctor, sample_patient):
        """GET /api/predictions/{id} returns same shape."""
        response = self._predict(
            client, auth_headers_doctor, sample_patient.patient_id
        )
        pred_id = response.json()["prediction_id"]

        get_response = client.get(
            f"/api/predictions/{pred_id}",
            headers=auth_headers_doctor,
        )
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["prediction_id"] == pred_id
        assert "class_probabilities" in data
        assert "explanation" in data
        assert "recommendations" in data

    def test_predict_nonexistent_patient_returns_404(
        self, client, auth_headers_doctor
    ):
        fake_id = "00000000-0000-0000-0000-000000000099"
        response = client.post(
            "/api/predict",
            headers=auth_headers_doctor,
            json={
                "patient_id": fake_id,
                "glucose": 100.0,
                "blood_pressure": 80.0,
                "insulin": 50.0,
                "bmi": 25.0,
            },
        )
        assert response.status_code == 404

    def test_predict_invalid_glucose_zero(
        self, client, auth_headers_doctor, sample_patient
    ):
        """glucose=0 should be rejected by Pydantic (gt=0)."""
        response = client.post(
            "/api/predict",
            headers=auth_headers_doctor,
            json={
                "patient_id": str(sample_patient.patient_id),
                "glucose": 0,
                "blood_pressure": 80.0,
                "insulin": 50.0,
                "bmi": 25.0,
            },
        )
        assert response.status_code == 422
