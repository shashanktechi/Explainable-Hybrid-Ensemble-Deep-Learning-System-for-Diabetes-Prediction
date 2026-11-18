"""
ORM model: model_registry table.
MySQL-compatible: UUID stored as CHAR(32) via SQLAlchemy Uuid(native_uuid=False).
Note: 'precision' is a SQL reserved word — SQLAlchemy quotes it automatically.
"""

import uuid
from datetime import datetime

from sqlalchemy import Float, String, Enum, DateTime, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from database.db_connection import Base


class ModelRegistry(Base):
    __tablename__ = "model_registry"

    model_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=False), primary_key=True,
        default=uuid.uuid4,
    )
    model_name: Mapped[str] = mapped_column(
        Enum("DNN", "XGBoost", "LightGBM", "Stack-DNN",
             name="model_name_type"),
        nullable=False,
    )
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    trained_on_dataset: Mapped[str | None] = mapped_column(String(50), nullable=True)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    precision: Mapped[float | None] = mapped_column(Float, nullable=True)
    recall: Mapped[float | None] = mapped_column(Float, nullable=True)
    f1: Mapped[float | None] = mapped_column(Float, nullable=True)
    mcc: Mapped[float | None] = mapped_column(Float, nullable=True)
    roc_auc: Mapped[float | None] = mapped_column(Float, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    trained_at: Mapped[datetime | None] = mapped_column(
        DateTime(), nullable=True
    )
