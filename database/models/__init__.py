"""
Import all ORM models so that Base.metadata contains every table.
Alembic and any code that does `from database.models import *` will pick them up.
"""

from database.models.user import User
from database.models.patient import Patient
from database.models.clinical_record import ClinicalRecord
from database.models.prediction import Prediction
from database.models.explanation import Explanation
from database.models.recommendation import Recommendation
from database.models.model_registry import ModelRegistry
from database.models.audit_log import AuditLog

__all__ = [
    "User",
    "Patient",
    "ClinicalRecord",
    "Prediction",
    "Explanation",
    "Recommendation",
    "ModelRegistry",
    "AuditLog",
]
