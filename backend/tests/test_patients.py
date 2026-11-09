"""
Patient CRUD tests.
"""


class TestPatientCRUD:
    def test_create_patient(self, client, auth_headers_doctor):
        response = client.post(
            "/api/patients",
            headers=auth_headers_doctor,
            json={
                "full_name": "Jane Doe",
                "age": 35,
                "gender": "F",
                "contact_number": "+1-555-0200",
            },
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
        assert len(data["items"]) >= 1

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

    def test_delete_patient_admin(self, client, auth_headers_admin, sample_patient):
        pid = str(sample_patient.patient_id)
        response = client.delete(f"/api/patients/{pid}", headers=auth_headers_admin)
        assert response.status_code == 204

    def test_get_nonexistent_patient_returns_404(self, client, auth_headers_doctor):
        fake_id = "00000000-0000-0000-0000-000000000099"
        response = client.get(f"/api/patients/{fake_id}", headers=auth_headers_doctor)
        assert response.status_code == 404

    def test_search_patients(self, client, auth_headers_doctor, sample_patient):
        response = client.get(
            "/api/patients?search=PAT-000001",
            headers=auth_headers_doctor,
        )
        assert response.status_code == 200
        assert response.json()["total"] >= 1


class TestClinicalRecords:
    def test_add_clinical_record(self, client, auth_headers_doctor, sample_patient):
        pid = str(sample_patient.patient_id)
        response = client.post(
            f"/api/patients/{pid}/records",
            headers=auth_headers_doctor,
            json={
                "glucose": 120.0,
                "blood_pressure": 80.0,
                "insulin": 100.0,
                "bmi": 27.5,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["glucose"] == 120.0
        assert data["patient_id"] == pid

    def test_list_clinical_records(self, client, auth_headers_doctor, sample_patient):
        pid = str(sample_patient.patient_id)
        # Add one first
        client.post(
            f"/api/patients/{pid}/records",
            headers=auth_headers_doctor,
            json={"glucose": 110.0, "blood_pressure": 75.0, "insulin": 80.0, "bmi": 24.0},
        )
        response = client.get(
            f"/api/patients/{pid}/records",
            headers=auth_headers_doctor,
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 1
