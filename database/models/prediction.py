"""
ORM model: predictions table.
"""

import uuid
from datetime import datetime

from sqlalchemy import Float, Integer, String, Enum, DateTime, ForeignKey, Index, CheckConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.db_connection import Base


class Prediction(Base):
    __tablename__ = "predictions"

    prediction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinical_records.record_id", ondelete="CASCADE"),
        nullable=False,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patients.patient_id"),
        nullable=False,
    )
    predicted_class: Mapped[str] = mapped_column(
        Enum("Non-Diabetic", "Pre-Diabetic", "Diabetic",
             name="predicted_class_type", create_constraint=True),
        nullable=False,
    )
    probability_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_band: Mapped[str] = mapped_column(
        Enum("Low", "Moderate", "High",
             name="risk_band_type", create_constraint=True),
        nullable=False,
    )
    model_version: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    clinical_record = relationship("ClinicalRecord", back_populates="prediction")
    patient = relationship("Patient", back_populates="predictions")
    explanation = relationship(
        "Explanation", back_populates="prediction", uselist=False,
        cascade="all, delete-orphan"
    )
    recommendations = relationship(
        "Recommendation", back_populates="prediction",
        cascade="all, delete-orphan"
    )

    # Constraints & Indexes
    __table_args__ = (
        CheckConstraint("risk_score >= 0 AND risk_score <= 100", name="ck_risk_score_range"),
        Index("ix_predictions_patient_id", "patient_id"),
        Index("ix_predictions_created_at", "created_at"),
    )
