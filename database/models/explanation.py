"""
ORM model: explanations table (SHAP / LIME values stored as JSON).
MySQL-compatible: UUID stored as CHAR(32) via SQLAlchemy Uuid(native_uuid=False).
JSON column type works natively on MySQL 8.0+ and SQLite (as TEXT).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, JSON, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.db_connection import Base


class Explanation(Base):
    __tablename__ = "explanations"

    explanation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=False), primary_key=True,
        default=uuid.uuid4,
    )
    prediction_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=False),
        ForeignKey("predictions.prediction_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    shap_values: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    lime_values: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    top_features: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    # Relationships
    prediction = relationship("Prediction", back_populates="explanation")
