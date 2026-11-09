"""
Audit logging helper — writes audit_log rows.
Pure service logic, no HTTP concerns.
"""

import uuid

from sqlalchemy.orm import Session

from database.models.audit_log import AuditLog


def log_audit(
    db: Session,
    user_id: uuid.UUID,
    action: str,
    target_table: str | None = None,
    target_id: uuid.UUID | None = None,
) -> AuditLog:
    """Create an audit_log entry and flush (caller commits the transaction)."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        target_table=target_table,
        target_id=target_id,
    )
    db.add(entry)
    db.flush()
    return entry
