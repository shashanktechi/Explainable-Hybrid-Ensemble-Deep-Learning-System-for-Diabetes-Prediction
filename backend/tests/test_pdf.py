"""Tests for PDF clinical report export, glossary, and email delivery."""

from database.models.audit_log import AuditLog


def _create_prediction(client, headers, patient_id):
    pred_resp = client.post(
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
    assert pred_resp.status_code == 201
    return pred_resp.json()["prediction_id"]


def test_download_prediction_pdf_returns_valid_pdf(client, auth_headers_doctor, sample_patient):
    pred_id = _create_prediction(client, auth_headers_doctor, sample_patient.patient_id)

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


def test_send_report_returns_400_when_patient_has_no_email(
    client, auth_headers_doctor, sample_patient
):
    pred_id = _create_prediction(client, auth_headers_doctor, sample_patient.patient_id)
    resp = client.post(f"/api/predictions/{pred_id}/send-report", headers=auth_headers_doctor)
    assert resp.status_code == 400
    assert "email" in resp.json()["detail"].lower()


def test_send_report_emails_pdf_when_patient_has_email(
    client, auth_headers_doctor, doctor_user, db, monkeypatch
):
    from backend.app.routes import pdf_routes

    patient_resp = client.post(
        "/api/patients",
        headers=auth_headers_doctor,
        json={
            "full_name": "Emailed Patient",
            "age": 50,
            "gender": "M",
            "email": "patient.report@example.com",
        },
    )
    assert patient_resp.status_code == 201
    patient_id = patient_resp.json()["patient_id"]
    pred_id = _create_prediction(client, auth_headers_doctor, patient_id)

    sent_calls = []

    def fake_send_report_email(recipient, patient_name, pdf_bytes, generated_at="", filename=""):
        sent_calls.append({
            "recipient": recipient,
            "patient_name": patient_name,
            "pdf_bytes": pdf_bytes,
            "filename": filename,
        })

    monkeypatch.setattr(pdf_routes, "send_report_email", fake_send_report_email)

    resp = client.post(f"/api/predictions/{pred_id}/send-report", headers=auth_headers_doctor)
    assert resp.status_code == 200
    assert resp.json() == {"sent": True, "recipient": "patient.report@example.com"}
    assert len(sent_calls) == 1
    assert sent_calls[0]["pdf_bytes"].startswith(b"%PDF-")
    assert db.query(AuditLog).filter(AuditLog.action == "sent_report_to_patient").first() is not None


def test_otp_email_includes_html_alternative_with_code():
    from backend.app.services.email_service import build_otp_email_message

    msg = build_otp_email_message("doc@example.com", "email_verification", "654321", 10)
    html_part = msg.get_body(preferencelist=("html",))
    plain_part = msg.get_body(preferencelist=("plain",))
    assert html_part is not None
    assert plain_part is not None
    html_content = html_part.get_content()
    assert "654321" in html_content
    assert "654321" in plain_part.get_content()
    assert "#0B1F3A" in html_content
    assert "#14B8A6" in html_content
