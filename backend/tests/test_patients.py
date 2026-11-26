"""
Patient CRUD tests.
"""


class TestPatientCRUD:
    def test_patient_access_is_limited_to_owner_or_admin(self, client, sample_patient, db):
        import uuid
        from backend.app.routes.auth_routes import create_access_token, hash_password
        from database.models.user import User

        other = User(user_id=uuid.uuid4(), full_name="Other Doctor", email="other@test.com",
                     password_hash=hash_password("Other@123"), role="doctor")
        db.add(other)
        db.commit()
        headers = {"Authorization": f"Bearer {create_access_token({'sub': str(other.user_id)})}"}
        response = client.get(f"/api/patients/{sample_patient.patient_id}", headers=headers)
        assert response.status_code == 404

    def test_create_patient(self, client, auth_headers_doctor, doctor_user):
        response = client.post(
            "/api/patients",
            headers=auth_headers_doctor,
            json={"full_name": "Jane Doe", "age": 35, "gender": "F", "contact_number": "+1-555-0200"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["full_name"] == "Jane Doe"
        assert data["patient_code"].startswith("PAT-")

    def test_list_patients(self, client, auth_headers_doctor, sample_patient):
        response = client.get("/api/patients", headers=auth_headers_doctor)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    def test_get_patient(self, client, auth_headers_doctor, sample_patient):
        pid = str(sample_patient.patient_id)
        response = client.get(f"/api/patients/{pid}", headers=auth_headers_doctor)
        assert response.status_code == 200
        assert response.json()["patient_id"] == pid

    def test_update_patient(self, client, auth_headers_doctor, sample_patient):
        pid = str(sample_patient.patient_id)
        response = client.put(
            f"/api/patients/{pid}",
            headers=auth_headers_doctor,
            json={"full_name": "Updated Name", "age": 50},
        )
        assert response.status_code == 200
        assert response.json()["full_name"] == "Updated Name"
        assert response.json()["age"] == 50

    def test_delete_patient_requires_admin(self, client, auth_headers_doctor, sample_patient):
        pid = str(sample_patient.patient_id)
        response = client.delete(f"/api/patients/{pid}", headers=auth_headers_doctor)
        assert response.status_code == 403

    def test_delete_patient_admin(self, client, auth_headers_admin, admin_user, sample_patient):
        pid = str(sample_patient.patient_id)
        response = client.delete(f"/api/patients/{pid}", headers=auth_headers_admin)
        assert response.status_code == 204

    def test_get_nonexistent_patient_returns_404(self, client, auth_headers_doctor, doctor_user):
        fake_id = "00000000-0000-0000-0000-000000000099"
        response = client.get(f"/api/patients/{fake_id}", headers=auth_headers_doctor)
        assert response.status_code == 404

    def test_search_patients(self, client, auth_headers_doctor, sample_patient):
        response = client.get("/api/patients?search=PAT-000001", headers=auth_headers_doctor)
        assert response.status_code == 200
        assert response.json()["total"] >= 1


class TestClinicalRecords:
    def test_add_clinical_record(self, client, auth_headers_doctor, sample_patient):
        pid = str(sample_patient.patient_id)
        response = client.post(
            f"/api/patients/{pid}/records",
            headers=auth_headers_doctor,
            json={"glucose": 120.0, "blood_pressure": 80.0, "insulin": 100.0, "bmi": 27.5},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["glucose"] == 120.0
        assert data["patient_id"] == pid

    def test_list_clinical_records(self, client, auth_headers_doctor, sample_patient):
        pid = str(sample_patient.patient_id)
        client.post(
            f"/api/patients/{pid}/records",
            headers=auth_headers_doctor,
            json={"glucose": 110.0, "blood_pressure": 75.0, "insulin": 80.0, "bmi": 24.0},
        )
        response = client.get(f"/api/patients/{pid}/records", headers=auth_headers_doctor)
        assert response.status_code == 200
        assert len(response.json()) >= 1
