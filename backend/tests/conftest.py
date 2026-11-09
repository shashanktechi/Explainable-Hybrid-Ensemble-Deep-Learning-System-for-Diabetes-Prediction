"""
Test fixtures — SQLite in-memory test database, TestClient, auth helpers.

Handles SQLite limitations:
- JSONB -> JSON type compilation
- UUID -> CHAR(32) (handled automatically by SQLAlchemy)
- PostgreSQL ENUM -> VARCHAR (handled by SQLAlchemy for SQLite)
"""

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB

# ---- JSONB -> JSON compilation for SQLite ----
# Must be registered BEFORE any engine/metadata operations
from sqlalchemy.ext.compiler import compiles
from sqlalchemy import JSON

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

# Now import the rest
from database.db_connection import Base, get_db
from backend.app.main import app
from backend.app.routes.auth_routes import hash_password, create_access_token


# ---------- Test DB setup ----------

TEST_DB_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "test.db"
)
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)


# Enable foreign key support in SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ---------- Fixtures ----------

@pytest.fixture(autouse=True)
def setup_database():
    """Create all tables before each test, drop after."""
    # Import all models to ensure metadata is populated
    import database.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    # Clean up test.db file
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass


@pytest.fixture
def db():
    """Provide a test DB session."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """TestClient for FastAPI app."""
    return TestClient(app)


@pytest.fixture
def admin_user(db):
    """Create and return an admin user."""
    from database.models.user import User

    user = User(
        user_id=uuid.UUID("a0000000-0000-0000-0000-000000000001"),
        full_name="Test Admin",
        email="admin@test.com",
        password_hash=hash_password("Admin@123"),
        role="admin",
        hospital_name="Test Hospital",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def doctor_user(db):
    """Create and return a doctor user."""
    from database.models.user import User

    user = User(
        user_id=uuid.UUID("a0000000-0000-0000-0000-000000000002"),
        full_name="Test Doctor",
        email="doctor@test.com",
        password_hash=hash_password("Doctor@123"),
        role="doctor",
        hospital_name="Test Hospital",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user):
    """JWT token for admin user."""
    return create_access_token(data={"sub": str(admin_user.user_id)})


@pytest.fixture
def doctor_token(doctor_user):
    """JWT token for doctor user."""
    return create_access_token(data={"sub": str(doctor_user.user_id)})


@pytest.fixture
def auth_headers_admin(admin_token):
    """Authorization headers for admin."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def auth_headers_doctor(doctor_token):
    """Authorization headers for doctor."""
    return {"Authorization": f"Bearer {doctor_token}"}


@pytest.fixture
def sample_patient(db, doctor_user):
    """Create and return a sample patient."""
    from database.models.patient import Patient

    patient = Patient(
        patient_id=uuid.UUID("b0000000-0000-0000-0000-000000000001"),
        patient_code="PAT-000001",
        full_name="Test Patient",
        age=45,
        gender="M",
        contact_number="+1-555-0101",
        created_by=doctor_user.user_id,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient
