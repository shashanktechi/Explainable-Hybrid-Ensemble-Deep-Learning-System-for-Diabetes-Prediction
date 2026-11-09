"""
Patient + clinical record CRUD routes.
"""

from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from backend.app.routes.auth_routes import get_current_user, require_admin
from backend.app.schemas.patient_schema import (
    PatientCreate,
    PatientUpdate,
    PatientOut,
    PatientListResponse,
    ClinicalRecordCreate,
    ClinicalRecordOut,
)
from backend.app.services.audit_service import log_audit
from backend.app.utils.logger import get_logger
from database.db_connection import get_db
from database.models.patient import Patient
from database.models.clinical_record import ClinicalRecord
from database.models.prediction import Prediction
from database.models.user import User

logger = get_logger(__name__)

router = APIRouter(prefix="/api/patients", tags=["Patients"])


# ---------- Helpers ----------

def _generate_patient_code(db: Session) -> str:
    """Auto-generate next patient code like PAT-000001."""
    last = (
        db.query(Patient)
        .order_by(Patient.patient_code.desc())
        .first()
    )
    if last and last.patient_code.startswith("PAT-"):
        try:
            num = int(last.patient_code.split("-")[1]) + 1
        except (IndexError, ValueError):
            num = 1
    else:
        num = 1
    return f"PAT-{num:06d}"


def _get_patient_or_404(db: Session, patient_id: uuid.UUID) -> Patient:
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )
    return patient


# ---------- Patient CRUD ----------

@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    body: PatientCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Create a new patient (created_by = current user)."""
    patient = Patient(
        patient_code=_generate_patient_code(db),
        full_name=body.full_name,
        age=body.age,
        gender=body.gender,
        contact_number=body.contact_number,
        created_by=current_user.user_id,
    )
    db.add(patient)
    db.flush()

    log_audit(db, current_user.user_id, "created_patient", "patients", patient.patient_id)
    db.commit()
    db.refresh(patient)

    logger.info("Patient %s created by %s", patient.patient_code, current_user.email)
    return patient


@router.get("", response_model=PatientListResponse)
def list_patients(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    search: str | None = Query(None, description="Search by patient_code or name"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """List patients (paginated, searchable by patient_code or name)."""
    query = db.query(Patient)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Patient.patient_code.ilike(pattern),
                Patient.full_name.ilike(pattern),
            )
        )

    total = query.count()
    items = (
        query.order_by(Patient.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return PatientListResponse(items=items, total=total, page=page, size=size)


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Get a single patient by ID."""
    return _get_patient_or_404(db, patient_id)


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: uuid.UUID,
    body: PatientUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Update patient demographics."""
    patient = _get_patient_or_404(db, patient_id)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    db.flush()
    log_audit(db, current_user.user_id, "updated_patient", "patients", patient.patient_id)
    db.commit()
    db.refresh(patient)

    logger.info("Patient %s updated by %s", patient.patient_code, current_user.email)
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: uuid.UUID,
    admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """Delete a patient (admin only). Cascades to clinical records, predictions, etc."""
    patient = _get_patient_or_404(db, patient_id)

    log_audit(db, admin.user_id, "deleted_patient", "patients", patient.patient_id)
    db.delete(patient)
    db.commit()

    logger.info("Patient %s deleted by admin %s", patient.patient_code, admin.email)


# ---------- Clinical Records ----------

@router.post(
    "/{patient_id}/records",
    response_model=ClinicalRecordOut,
    status_code=status.HTTP_201_CREATED,
)
def add_clinical_record(
    patient_id: uuid.UUID,
    body: ClinicalRecordCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Add a clinical record (lab values) for a patient."""
    _get_patient_or_404(db, patient_id)

    record = ClinicalRecord(
        patient_id=patient_id,
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
    db.commit()
    db.refresh(record)
    return record


@router.get("/{patient_id}/records", response_model=list[ClinicalRecordOut])
def list_clinical_records(
    patient_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """List clinical records for a patient."""
    _get_patient_or_404(db, patient_id)
    return (
        db.query(ClinicalRecord)
        .filter(ClinicalRecord.patient_id == patient_id)
        .order_by(ClinicalRecord.recorded_at.desc())
        .all()
    )


# ---------- Prediction History ----------

@router.get("/{patient_id}/predictions")
def list_patient_predictions(
    patient_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Prediction history for a patient (newest first) — for HistoryPage."""
    _get_patient_or_404(db, patient_id)

    predictions = (
        db.query(Prediction)
        .filter(Prediction.patient_id == patient_id)
        .order_by(Prediction.created_at.desc())
        .all()
    )

    # Return lightweight list (full detail via GET /api/predictions/{id})
    return [
        {
            "prediction_id": str(p.prediction_id),
            "record_id": str(p.record_id),
            "predicted_class": p.predicted_class,
            "probability_score": p.probability_score,
            "risk_score": p.risk_score,
            "risk_band": p.risk_band,
            "model_version": p.model_version,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in predictions
    ]
