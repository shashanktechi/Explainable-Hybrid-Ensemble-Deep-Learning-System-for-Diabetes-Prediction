"""Tests for PDF clinical report export endpoint."""


def test_download_prediction_pdf_returns_valid_pdf(client, auth_headers_doctor, sample_patient):
    pred_resp = client.post(
        "/api/predict",
        headers=auth_headers_doctor,
        json={
            "patient_id": str(sample_patient.patient_id),
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
    assert pred_resp.status_code == 201
    pred_id = pred_resp.json()["prediction_id"]

    pdf_resp = client.get(f"/api/predictions/{pred_id}/pdf", headers=auth_headers_doctor)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert "attachment;" in pdf_resp.headers.get("content-disposition", "")
    assert pdf_resp.content.startswith(b"%PDF-")


def test_download_prediction_pdf_not_found(client, auth_headers_doctor):
    resp = client.get(
        "/api/predictions/00000000-0000-0000-0000-000000000099/pdf",
        headers=auth_headers_doctor,
    )
    assert resp.status_code == 404

