"""
Pydantic schemas for prediction request and response.
Response shape matches the exact JSON the React frontend depends on (spec §5).
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    patient_id: uuid.UUID
    pregnancies: int | None = Field(None, ge=0, le=20)
    glucose: float = Field(..., gt=0, le=600)
    blood_pressure: float = Field(..., gt=0, le=250)
    skin_thickness: float | None = Field(None, gt=0, le=100)
    insulin: float = Field(..., ge=0, le=1000)
    bmi: float = Field(..., gt=0, le=80)
    hba1c: float | None = Field(None, ge=3, le=20)
    diabetes_pedigree_fn: float | None = Field(None, ge=0, le=3)


class ExplanationOut(BaseModel):
    shap_values: dict[str, float]
    lime_values: dict[str, float]
    top_features: list[str]


class RecommendationOut(BaseModel):
    category: str
    text: str


class PredictResponse(BaseModel):
    prediction_id: str
    record_id: str
    patient_id: str
    predicted_class: str
    class_probabilities: dict[str, float]
    probability_score: float
    risk_score: int
    risk_band: str
    model_version: str
    explanation: ExplanationOut
    recommendations: list[RecommendationOut]
    created_at: str


class ModelRegistryOut(BaseModel):
    model_id: uuid.UUID
    model_name: str
    version: str
    trained_on_dataset: str | None = None
    accuracy: float | None = None
    precision: float | None = None
    recall: float | None = None
    f1: float | None = None
    mcc: float | None = None
    roc_auc: float | None = None
    file_path: str | None = None
    trained_at: datetime | None = None

    model_config = {"from_attributes": True}


class AuditLogOut(BaseModel):
    log_id: uuid.UUID
    user_id: uuid.UUID
    action: str
    target_table: str | None = None
    target_id: uuid.UUID | None = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    size: int
