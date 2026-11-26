"""
ORM model: clinical_records table (one row per visit / lab test — model input).
MySQL-compatible: UUID stored as CHAR(32) via SQLAlchemy Uuid(native_uuid=False).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Float, Integer, String, DateTime, ForeignKey, Index, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.db_connection import Base


class ClinicalRecord(Base):
    __tablename__ = "clinical_records"

    record_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=False), primary_key=True,
        default=uuid.uuid4,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=False),
        ForeignKey("patients.patient_id", ondelete="CASCADE"),
        nullable=False,
    )
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    pregnancies: Mapped[int | None] = mapped_column(Integer, nullable=True)
    glucose: Mapped[float] = mapped_column(Float, nullable=False)
    blood_pressure: Mapped[float] = mapped_column(Float, nullable=False)
    skin_thickness: Mapped[float | None] = mapped_column(Float, nullable=True)
    insulin: Mapped[float] = mapped_column(Float, nullable=False)
    bmi: Mapped[float] = mapped_column(Float, nullable=False)
    hba1c: Mapped[float | None] = mapped_column(Float, nullable=True)
    diabetes_pedigree_fn: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
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
