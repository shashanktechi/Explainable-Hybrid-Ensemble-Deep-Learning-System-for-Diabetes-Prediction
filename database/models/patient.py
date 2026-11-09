"""
ORM model: patients table (demographics only, no lab values).
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Enum, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.db_connection import Base


class Patient(Base):
    __tablename__ = "patients"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    patient_code: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(
        Enum("M", "F", "Other", name="gender_type", create_constraint=True),
        nullable=False,
    )
    contact_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    creator = relationship("User", back_populates="patients")
    clinical_records = relationship(
        "ClinicalRecord", back_populates="patient", cascade="all, delete-orphan"
    )
    predictions = relationship(
        "Prediction", back_populates="patient", cascade="all, delete-orphan"
    )

    # Indexes
    __table_args__ = (
        Index("ix_patients_patient_code", "patient_code"),
    )
