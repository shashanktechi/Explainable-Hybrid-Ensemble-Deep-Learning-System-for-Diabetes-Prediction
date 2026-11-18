"""
ORM model: users table.
MySQL-compatible: UUID stored as CHAR(32) via SQLAlchemy Uuid(native_uuid=False).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Enum, DateTime, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.db_connection import Base


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=False), primary_key=True,
        default=uuid.uuid4,
    )
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        Enum("doctor", "admin", name="user_role"),
        nullable=False,
    )
    hospital_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
    last_login: Mapped[datetime | None] = mapped_column(
        DateTime(), nullable=True
    )

    # Relationships
    patients = relationship("Patient", back_populates="creator")
    audit_logs = relationship("AuditLog", back_populates="user")
