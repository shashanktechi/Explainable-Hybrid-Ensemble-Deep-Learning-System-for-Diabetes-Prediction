"""
ORM model: recommendations table.
MySQL-compatible: UUID stored as CHAR(32) via SQLAlchemy Uuid(native_uuid=False).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Text, Enum, DateTime, ForeignKey, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.db_connection import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=False), primary_key=True,
        default=uuid.uuid4,
    )
    prediction_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=False),
        ForeignKey("predictions.prediction_id", ondelete="CASCADE"),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(
        Enum("diet", "lifestyle", "follow_up",
             name="recommendation_category"),
        nullable=False,
    )
    recommendation_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    # Relationships
    prediction = relationship("Prediction", back_populates="recommendations")
