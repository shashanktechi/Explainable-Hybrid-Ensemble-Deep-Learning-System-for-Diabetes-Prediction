"""
ORM model: explanations table (SHAP / LIME values stored as JSONB).
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.db_connection import Base


class Explanation(Base):
    __tablename__ = "explanations"

    explanation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    prediction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("predictions.prediction_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    shap_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    lime_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    top_features: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    prediction = relationship("Prediction", back_populates="explanation")
