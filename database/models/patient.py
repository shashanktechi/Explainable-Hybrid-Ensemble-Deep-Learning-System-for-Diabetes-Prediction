"""
ORM model: patients table (demographics only, no lab values).
MySQL-compatible: UUID stored as CHAR(32) via SQLAlchemy Uuid(native_uuid=False).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Enum, DateTime, ForeignKey, Index, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.db_connection import Base


class Patient(Base):
    __tablename__ = "patients"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=False), primary_key=True,
        default=uuid.uuid4,
    )
    patient_code: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(
        Enum("M", "F", "Other", name="gender_type"),
        nullable=False,
    )
    contact_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=False), ForeignKey("users.user_id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
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
