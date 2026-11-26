"""
PDF report export — GET /api/predictions/{prediction_id}/pdf

Returns a downloadable clinical report as a PDF built from the stored
prediction, SHAP/LIME explanation, risk score, and recommendations.

Requires: reportlab (pip install reportlab)
If reportlab is absent the endpoint returns 503 with a clear error message
rather than crashing the whole API.
"""

import io
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from backend.app.routes.auth_routes import get_current_user
from database.db_connection import get_db
from database.models.explanation import Explanation
from database.models.patient import Patient
from database.models.prediction import Prediction
from database.models.recommendation import Recommendation
from database.models.user import User

router = APIRouter(tags=["Reports"])


def _require_reportlab():
    try:
        import reportlab  # noqa: F401
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
        )
        return colors, A4, getSampleStyleSheet, ParagraphStyle, cm, SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF export requires reportlab. Install it with: pip install reportlab",
        ) from exc


def _band_color_hex(risk_band: str) -> str:
    return {"High": "#D97706", "Moderate": "#CA8A04", "Low": "#14B8A6"}.get(risk_band, "#6B7280")


def _build_pdf(
    prediction: Prediction,
    patient: Patient,
    explanation: Explanation | None,
    recommendations: list[Recommendation],
) -> bytes:
    colors, A4, getSampleStyleSheet, ParagraphStyle, cm, SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable = _require_reportlab()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=18, spaceAfter=6, textColor=colors.HexColor("#0B1F3A"))
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, spaceAfter=4, spaceBefore=12, textColor=colors.HexColor("#14B8A6"))
    body = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, leading=14)
    small = ParagraphStyle("Small", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#6B7280"))
    band_color = colors.HexColor(_band_color_hex(prediction.risk_band))

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("XAI-HEDL Clinical Prediction Report", h1))
    story.append(Paragraph("Explainable Hybrid Ensemble Deep Learning System for Diabetes Prediction", small))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#14B8A6"), spaceAfter=12))

    # ── Patient / Prediction metadata ─────────────────────────────────────────
    story.append(Paragraph("Patient & Prediction Details", h2))
    meta_data = [
        ["Patient Name", patient.full_name, "Patient Code", patient.patient_code],
        ["Age", str(patient.age), "Gender", patient.gender],
        ["Prediction ID", str(prediction.prediction_id)[:8] + "…", "Model Version", prediction.model_version],
        ["Created At", prediction.created_at.strftime("%Y-%m-%d %H:%M UTC") if prediction.created_at else "—", "", ""],
    ]
    meta_table = Table(meta_data, colWidths=[4 * cm, 6 * cm, 4 * cm, 4 * cm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#374151")),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#374151")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # ── Risk Result ───────────────────────────────────────────────────────────
    story.append(Paragraph("Prediction Result", h2))
    result_data = [
        ["Predicted Class", prediction.predicted_class],
        ["Risk Score", f"{prediction.risk_score} / 100"],
        ["Risk Band", prediction.risk_band],
        ["Probability Score", f"{prediction.probability_score:.1%}"],
    ]
    if prediction.class_probabilities:
        for cls, prob in prediction.class_probabilities.items():
            result_data.append([f"  {cls}", f"{prob:.1%}"])
    result_table = Table(result_data, colWidths=[6 * cm, 12 * cm])
    result_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), band_color),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(result_table)
    story.append(Spacer(1, 12))

    # ── SHAP Explanation ──────────────────────────────────────────────────────
    if explanation and explanation.shap_values:
        story.append(Paragraph("SHAP Feature Contributions (Kernel SHAP)", h2))
        story.append(Paragraph(
            "Positive values push the prediction toward Diabetic; negative values reduce risk.",
            body,
        ))
        story.append(Spacer(1, 6))
        shap_sorted = sorted(explanation.shap_values.items(), key=lambda x: abs(x[1]), reverse=True)
        shap_rows = [["Feature", "SHAP Value", "Direction"]]
        for feat, val in shap_sorted:
            direction = "↑ Risk" if val > 0 else "↓ Risk"
            shap_rows.append([feat.replace("_", " ").title(), f"{val:+.4f}", direction])
        shap_table = Table(shap_rows, colWidths=[7 * cm, 5 * cm, 6 * cm])
        shap_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B1F3A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(shap_table)
        story.append(Spacer(1, 12))

    # ── LIME Explanation ──────────────────────────────────────────────────────
    if explanation and explanation.lime_values:
        story.append(Paragraph("LIME Local Explanation", h2))
        lime_sorted = sorted(explanation.lime_values.items(), key=lambda x: abs(x[1]), reverse=True)
        lime_rows = [["Feature", "LIME Weight"]]
        for feat, val in lime_sorted:
            lime_rows.append([feat.replace("_", " ").title(), f"{val:+.4f}"])
        lime_table = Table(lime_rows, colWidths=[9 * cm, 9 * cm])
        lime_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B1F3A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(lime_table)
        story.append(Spacer(1, 12))

    # ── Recommendations ───────────────────────────────────────────────────────
    if recommendations:
        story.append(Paragraph("Clinical Recommendations", h2))
        for rec in recommendations:
            category_label = rec.category.replace("_", " ").title()
            story.append(Paragraph(f"<b>{category_label}:</b> {rec.recommendation_text}", body))
            story.append(Spacer(1, 4))
        story.append(Spacer(1, 8))

    # ── Disclaimer ────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E5E7EB"), spaceAfter=8))
    story.append(Paragraph(
        "DISCLAIMER: This report is generated by an AI-assisted decision-support tool and is "
        "intended for use by qualified healthcare professionals only. It does not constitute a "
        "definitive clinical diagnosis. All findings must be confirmed by appropriate clinical "
        "examination and laboratory investigation.",
        small,
    ))

    doc.build(story)
    return buf.getvalue()


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get(
    "/api/predictions/{prediction_id}/pdf",
    summary="Download prediction report as PDF",
    responses={
        200: {"content": {"application/pdf": {}}, "description": "PDF report"},
        404: {"description": "Prediction not found"},
        503: {"description": "reportlab not installed"},
    },
)
def download_prediction_pdf(
    prediction_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Generate and stream a clinical PDF report for the given prediction."""
    # Fetch prediction (scoped to owning doctor or admin)
    q = (
        db.query(Prediction)
        .join(Patient, Prediction.patient_id == Patient.patient_id)
        .filter(Prediction.prediction_id == prediction_id)
    )
    if current_user.role != "admin":
        q = q.filter(Patient.created_by == current_user.user_id)
    prediction = q.first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    patient = db.query(Patient).filter(Patient.patient_id == prediction.patient_id).first()
    explanation = (
        db.query(Explanation)
        .filter(Explanation.prediction_id == prediction_id)
        .first()
    )
    recommendations = (
        db.query(Recommendation)
        .filter(Recommendation.prediction_id == prediction_id)
        .all()
    )

    pdf_bytes = _build_pdf(prediction, patient, explanation, recommendations)

    filename = f"xai_hedl_report_{str(prediction_id)[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

