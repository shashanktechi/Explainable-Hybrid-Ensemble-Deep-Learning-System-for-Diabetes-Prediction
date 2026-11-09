"""
ORM model: clinical_records table (one row per visit / lab test — model input).
"""

import uuid
from datetime import datetime

from sqlalchemy import Float, Integer, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.db_connection import Base


class ClinicalRecord(Base):
    __tablename__ = "clinical_records"

    record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patients.patient_id", ondelete="CASCADE"),
        nullable=False,
    )
    pregnancies: Mapped[int | None] = mapped_column(Integer, nullable=True)
    glucose: Mapped[float] = mapped_column(Float, nullable=False)
    blood_pressure: Mapped[float] = mapped_column(Float, nullable=False)
    skin_thickness: Mapped[float | None] = mapped_column(Float, nullable=True)
    insulin: Mapped[float] = mapped_column(Float, nullable=False)
    bmi: Mapped[float] = mapped_column(Float, nullable=False)
    hba1c: Mapped[float | None] = mapped_column(Float, nullable=True)
    diabetes_pedigree_fn: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    patient = relationship("Patient", back_populates="clinical_records")
    prediction = relationship(
        "Prediction", back_populates="clinical_record", uselist=False,
        cascade="all, delete-orphan"
    )

    # Indexes
    __table_args__ = (
        Index("ix_clinical_records_patient_id", "patient_id"),
    )
