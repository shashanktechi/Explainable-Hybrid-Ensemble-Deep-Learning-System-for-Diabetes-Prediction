"""
Test configuration using SQLite in-memory with a single shared connection (StaticPool).

All fixtures and TestClient route handlers share the same underlying SQLite connection
so fixture data is immediately visible to route handlers — no cross-connection gaps.

SQLite compatibility:
  - Uuid(native_uuid=False) → stored as CHAR(32) on both MySQL and SQLite ✓
  - JSON column → SQLite stores as TEXT, SQLAlchemy handles serialization ✓
  - Enum → SQLAlchemy renders inline VARCHAR on SQLite ✓
  - DateTime() default=lambda set on models → no server-side function needed ✓
"""

import uuid
import pytest

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

import database.models  # noqa: F401 — registers all ORM classes with Base
from database.db_connection import Base, get_db
from backend.app.main import app
from backend.app.routes.auth_routes import hash_password, create_access_token

# ── Single shared in-memory SQLite engine ────────────────────────────────────
SQLITE_URL = "sqlite://"

engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _rec):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON")
    cur.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Override FastAPI dependency ───────────────────────────────────────────────

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ── Autouse fixture — fresh schema per test ───────────────────────────────────

@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# ── TestClient ────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def otp_codes(monkeypatch):
    """Capture outbound test codes without sending email or exposing them via the API."""
    from backend.app.routes import auth_routes
    from backend.app.services import otp_service

    codes = {}
    monkeypatch.setattr(auth_routes, "email_delivery_configured", lambda: True)
    monkeypatch.setattr(
        otp_service,
        "send_otp_email",
        lambda email, purpose, code, _expires: codes.__setitem__((email, purpose), code),
    )
    return codes


# ── Direct DB session for assertions ──────────────────────────────────────────

@pytest.fixture
def db(reset_db):
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


# ── User seed helpers ──────────────────────────────────────────────────────────

@pytest.fixture
def admin_user(reset_db):
    from database.models.user import User
    session = TestingSessionLocal()
    try:
        user = User(
            user_id=uuid.UUID("a0000000-0000-0000-0000-000000000001"),
            full_name="Test Admin",
            email="admin@test.com",
            password_hash=hash_password("Admin@123"),
            role="admin",
            hospital_name="Test Hospital",
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    finally:
        session.close()


@pytest.fixture
def doctor_user(reset_db):
    from database.models.user import User
    session = TestingSessionLocal()
    try:
        user = User(
            user_id=uuid.UUID("a0000000-0000-0000-0000-000000000002"),
            full_name="Test Doctor",
            email="doctor@test.com",
            password_hash=hash_password("Doctor@123"),
            role="doctor",
            hospital_name="Test Hospital",
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    finally:
        session.close()


@pytest.fixture
def admin_token(admin_user):
    return create_access_token(data={"sub": str(admin_user.user_id)})


@pytest.fixture
def doctor_token(doctor_user):
    return create_access_token(data={"sub": str(doctor_user.user_id)})


@pytest.fixture
def auth_headers_admin(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def auth_headers_doctor(doctor_token):
    return {"Authorization": f"Bearer {doctor_token}"}


@pytest.fixture
def sample_patient(reset_db, doctor_user):
    from database.models.patient import Patient
    session = TestingSessionLocal()
    try:
        patient = Patient(
            patient_id=uuid.UUID("b0000000-0000-0000-0000-000000000001"),
            patient_code="PAT-000001",
            full_name="Test Patient",
            age=45,
            gender="M",
            contact_number="+1-555-0101",
            created_by=doctor_user.user_id,
        )
        session.add(patient)
        session.commit()
        session.refresh(patient)
        return patient
    finally:
        session.close()
