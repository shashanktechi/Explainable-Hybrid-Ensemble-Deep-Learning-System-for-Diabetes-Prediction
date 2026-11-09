"""
Pydantic schemas for patients and clinical records.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ---------- Patient ----------

class PatientCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=1, le=120)
    gender: str = Field(..., pattern=r"^(M|F|Other)$")
    contact_number: str | None = Field(None, max_length=20)


class PatientUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=100)
    age: int | None = Field(None, ge=1, le=120)
    gender: str | None = Field(None, pattern=r"^(M|F|Other)$")
    contact_number: str | None = Field(None, max_length=20)


class PatientOut(BaseModel):
    patient_id: uuid.UUID
    patient_code: str
    full_name: str
    age: int
    gender: str
    contact_number: str | None = None
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class PatientListResponse(BaseModel):
    items: list[PatientOut]
    total: int
    page: int
    size: int


# ---------- Clinical Record ----------

class ClinicalRecordCreate(BaseModel):
    pregnancies: int | None = Field(None, ge=0, le=20)
    glucose: float = Field(..., gt=0, le=600)
    blood_pressure: float = Field(..., gt=0, le=250)
    skin_thickness: float | None = Field(None, gt=0, le=100)
    insulin: float = Field(..., ge=0, le=1000)
    bmi: float = Field(..., gt=0, le=80)
    hba1c: float | None = Field(None, ge=3, le=20)
    diabetes_pedigree_fn: float | None = Field(None, ge=0, le=3)


class ClinicalRecordOut(BaseModel):
    record_id: uuid.UUID
    patient_id: uuid.UUID
    pregnancies: int | None = None
    glucose: float
    blood_pressure: float
    skin_thickness: float | None = None
    insulin: float
    bmi: float
    hba1c: float | None = None
    diabetes_pedigree_fn: float | None = None
    recorded_at: datetime

    model_config = {"from_attributes": True}
