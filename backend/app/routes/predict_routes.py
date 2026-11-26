"""
Prediction routes — POST /api/predict, GET /api/predictions/{id},
GET /api/models, GET /api/audit.
"""

from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.routes.auth_routes import get_current_user, require_admin
from backend.app.schemas.prediction_schema import (
    PredictRequest,
    PredictResponse,
    ExplanationOut,
    RecommendationOut,
    ModelRegistryOut,
    AuditLogOut,
    AuditLogListResponse,
)
from backend.app.services.audit_service import log_audit
from backend.app.services.prediction_service import predictor
from backend.app.services.risk_score_service import (
    compute_probability_score,
    compute_risk_score,
    compute_risk_band,
)
from backend.app.services.explanation_service import (
    compute_shap_values,
    compute_lime_values,
    compute_top_features,
    generate_recommendations,
)
from backend.app.utils.logger import get_logger
from backend.app.utils.validators import validate_clinical_input
from database.db_connection import get_db
from database.models.audit_log import AuditLog
from database.models.clinical_record import ClinicalRecord
from database.models.explanation import Explanation
from database.models.model_registry import ModelRegistry
from database.models.patient import Patient
from database.models.prediction import Prediction
from database.models.recommendation import Recommendation
from database.models.user import User

logger = get_logger(__name__)

router = APIRouter(tags=["Predictions"])


@router.get("/api/predictions")
def list_predictions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    risk_band: str | None = Query(None, pattern="^(Low|Moderate|High)$"),
    search: str | None = Query(None, max_length=100),
):
    """List prediction history, restricted to owned patients or admins."""
    query = db.query(Prediction).join(Patient, Prediction.patient_id == Patient.patient_id)
    if current_user.role != "admin":
        query = query.filter(Patient.created_by == current_user.user_id)
    if risk_band:
        query = query.filter(Prediction.risk_band == risk_band)
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(Patient.full_name.ilike(pattern), Patient.patient_code.ilike(pattern)))
    total = query.count()
    rows = query.order_by(Prediction.created_at.desc()).offset((page - 1) * size).limit(size).all()
    items = [{"prediction_id": str(item.prediction_id), "record_id": str(item.record_id),
              "patient_id": str(item.patient_id), "patient_name": item.patient.full_name,
              "patient_code": item.patient.patient_code, "predicted_class": item.predicted_class,
              "probability_score": item.probability_score, "class_probabilities": item.class_probabilities,
              "risk_score": item.risk_score, "risk_band": item.risk_band,
              "model_version": item.model_version,
              "created_at": item.created_at.isoformat() if item.created_at else None}
             for item in rows]
    return {"items": items, "total": total, "page": page, "size": size}


def _build_response(
    prediction: Prediction,
    class_probabilities: dict[str, float],
    shap_values: dict[str, float],
    lime_values: dict[str, float],
    top_features: list[str],
    recommendations_data: list[dict[str, str]],
    explanation_method: str = "heuristic (stub predictor)",
) -> PredictResponse:
    """Build the exact JSON response shape from spec §5."""
    return PredictResponse(
        prediction_id=str(prediction.prediction_id),
        record_id=str(prediction.record_id),
        patient_id=str(prediction.patient_id),
        predicted_class=prediction.predicted_class,
        class_probabilities=class_probabilities,
        probability_score=prediction.probability_score,
        risk_score=prediction.risk_score,
        risk_band=prediction.risk_band,
        model_version=prediction.model_version,
        explanation=ExplanationOut(
            shap_values=shap_values,
            lime_values=lime_values,
            top_features=top_features,
            method=explanation_method,
        ),
        recommendations=[
            RecommendationOut(category=r["category"], text=r["text"])
            for r in recommendations_data
        ],
        created_at=prediction.created_at.isoformat() if prediction.created_at else "",
    )


# ---------- POST /api/predict ----------

@router.post("/api/predict", response_model=PredictResponse, status_code=status.HTTP_201_CREATED)
def run_prediction(
    body: PredictRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Full prediction flow (one DB transaction):
    1. validate input
    2. save clinical_record
    3. prediction_service -> class probabilities
    4. risk_score_service -> risk_score + risk_band
    5. explanation_service -> shap, lime, top_features, recommendations
    6. save predictions, explanations, recommendations rows
    7. audit_log 'ran_prediction'
    """
    # 0. Check patient exists
    patient_query = db.query(Patient).filter(Patient.patient_id == body.patient_id)
    if current_user.role != "admin":
        patient_query = patient_query.filter(Patient.created_by == current_user.user_id)
    patient = patient_query.first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    # 1. Validate input
    features = {
        "age": patient.age,
        "gender": patient.gender,
        "pregnancies": body.pregnancies,
        "glucose": body.glucose,
        "blood_pressure": body.blood_pressure,
        "skin_thickness": body.skin_thickness,
        "insulin": body.insulin,
        "bmi": body.bmi,
        "hba1c": body.hba1c,
        "diabetes_pedigree_fn": body.diabetes_pedigree_fn,
    }
    errors = validate_clinical_input(features)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="; ".join(errors),
        )

    # 2. Save clinical record
    record = ClinicalRecord(
        patient_id=body.patient_id,
        age=patient.age,
        gender=patient.gender,
        pregnancies=body.pregnancies,
        glucose=body.glucose,
        blood_pressure=body.blood_pressure,
        skin_thickness=body.skin_thickness,
        insulin=body.insulin,
        bmi=body.bmi,
        hba1c=body.hba1c,
        diabetes_pedigree_fn=body.diabetes_pedigree_fn,
    )
    db.add(record)
    db.flush()  # get record_id

    # 3. Predict
    try:
        class_probabilities = predictor.predict_proba(features)
    except (ValueError, FileNotFoundError) as exc:
        logger.error("Configured prediction artifact does not match the API input contract: %s", exc)
        raise HTTPException(status_code=503, detail="Prediction model is unavailable for this input contract") from exc
    if (not class_probabilities or any(not 0.0 <= float(value) <= 1.0 for value in class_probabilities.values())
            or abs(sum(class_probabilities.values()) - 1.0) > 1e-5):
        raise HTTPException(status_code=503, detail="Prediction model returned invalid probabilities")

    # Determine predicted class (highest probability)
    predicted_class = max(class_probabilities, key=class_probabilities.get)  # type: ignore[arg-type]

    # 4. Risk score
    probability_score = compute_probability_score(class_probabilities)
    risk_score = compute_risk_score(probability_score)
    risk_band = compute_risk_band(risk_score)

    # 5. Explanations
    try:
        if hasattr(predictor, "explain"):
            shap_values, lime_values = predictor.explain(features)
            explanation_method = "Kernel SHAP + LIME"
        else:
            shap_values = compute_shap_values(features, predictor)
            lime_values = compute_lime_values(features, predictor)
            explanation_method = "heuristic (stub predictor)"
    except (RuntimeError, ValueError) as exc:
        logger.exception("Model explanation failed")
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    top_features = compute_top_features(shap_values)
    recommendations_data = generate_recommendations(risk_band, top_features, features)

    # Keep model label mapping explicit; this persistence/API contract is
    # three-class and must not silently reinterpret binary datasets.
    if set(class_probabilities) != {"Non-Diabetic", "Pre-Diabetic", "Diabetic"}:
        raise HTTPException(status_code=503, detail="Model labels must be explicitly mapped to the API classes before serving")

    # 6. Save prediction
    prediction_row = Prediction(
        record_id=record.record_id,
        patient_id=body.patient_id,
        predicted_class=predicted_class,
        probability_score=probability_score,
        class_probabilities=class_probabilities,
        risk_score=risk_score,
        risk_band=risk_band,
        model_version=settings.model_version,
        model_artifact_sha256=getattr(predictor, "artifact_sha256", None),
    )
    db.add(prediction_row)
    db.flush()

    # Save explanation
    explanation_row = Explanation(
        prediction_id=prediction_row.prediction_id,
        shap_values=shap_values,
        lime_values=lime_values,
        top_features=top_features,
        method=explanation_method,
    )
    db.add(explanation_row)

    # Save recommendations
    for rec in recommendations_data:
        rec_row = Recommendation(
            prediction_id=prediction_row.prediction_id,
            category=rec["category"],
            recommendation_text=rec["text"],
        )
        db.add(rec_row)

    # 7. Audit
    log_audit(db, current_user.user_id, "ran_prediction", "predictions", prediction_row.prediction_id)

    db.commit()
    db.refresh(prediction_row)

    logger.info(
        "Prediction %s for patient %s: %s (risk_score=%d)",
        prediction_row.prediction_id, patient.patient_code,
        predicted_class, risk_score,
    )

    return _build_response(
        prediction_row, class_probabilities,
        shap_values, lime_values, top_features, recommendations_data, explanation_method,
    )


# ---------- GET /api/predictions/{prediction_id} ----------

@router.get("/api/predictions/{prediction_id}", response_model=PredictResponse)
def get_prediction(
    prediction_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Retrieve a prediction by ID (from DB). Logs 'viewed_prediction'."""
    prediction_query = (
        db.query(Prediction)
        .join(Patient, Prediction.patient_id == Patient.patient_id)
        .filter(Prediction.prediction_id == prediction_id)
    )
    if current_user.role != "admin":
        prediction_query = prediction_query.filter(Patient.created_by == current_user.user_id)
    prediction = prediction_query.first()
    if not prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")

    # Load related explanation
    explanation = (
        db.query(Explanation)
        .filter(Explanation.prediction_id == prediction_id)
        .first()
    )
    shap_values = explanation.shap_values if explanation else {}
    lime_values = explanation.lime_values if explanation else {}
    top_features = explanation.top_features if explanation else []

    # Load related recommendations
    recs = (
        db.query(Recommendation)
        .filter(Recommendation.prediction_id == prediction_id)
        .all()
    )
    recommendations_data = [
        {"category": r.category, "text": r.recommendation_text}
        for r in recs
    ]

    # Return the probabilities recorded with this model run. Legacy rows
    # without a stored vector are explicitly reported as non-reproducible.
    class_probabilities = _reconstruct_class_probabilities(prediction)

    # Audit
    log_audit(db, current_user.user_id, "viewed_prediction", "predictions", prediction.prediction_id)
    db.commit()

    return _build_response(
        prediction, class_probabilities,
        shap_values, lime_values, top_features, recommendations_data,
        explanation.method if explanation and explanation.method else "legacy explanation (method unknown)",
    )


def _reconstruct_class_probabilities(prediction: Prediction) -> dict[str, float]:
    if prediction.class_probabilities:
        return prediction.class_probabilities
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="This legacy prediction has no stored class probabilities and cannot be reproduced from its current model version",
    )


# ---------- GET /api/models ----------

@router.get("/api/models", response_model=list[ModelRegistryOut])
def list_models(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """List model_registry rows."""
    return db.query(ModelRegistry).all()


# ---------- GET /api/audit ----------

@router.get("/api/audit", response_model=AuditLogListResponse)
def list_audit_logs(
    admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """List audit log entries (admin only, paginated)."""
    query = db.query(AuditLog)
    total = query.count()
    items = (
        query.order_by(AuditLog.timestamp.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return AuditLogListResponse(items=items, total=total, page=page, size=size)
