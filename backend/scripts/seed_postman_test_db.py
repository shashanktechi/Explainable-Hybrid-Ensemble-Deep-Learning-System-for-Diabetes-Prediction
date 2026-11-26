"""Create the disposable SQLite database and admin used by the Postman collection."""

import uuid

import database.models  # noqa: F401 — register all ORM models with Base
from backend.app.routes.auth_routes import hash_password
from database.db_connection import Base, SessionLocal, engine
from database.models.user import User


def main() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        session.add_all(
            [
                User(
                    user_id=uuid.uuid4(), full_name="Postman Test Admin",
                    email="postman-admin@example.test",
                    password_hash=hash_password("Postman-Test-Only-2026!"),
                    role="admin", hospital_name="Local Test Hospital", email_verified=True,
                ),
                User(
                    user_id=uuid.uuid4(), full_name="Postman Test Doctor",
                    email="postman-doctor@example.com",
                    password_hash=hash_password("Postman-Doctor-Only-2026!"),
                    role="doctor", hospital_name="Local Test Hospital", email_verified=True,
                ),
            ]
        )
        session.commit()
    print("Prepared disposable Postman test database and admin account.")


if __name__ == "__main__":
    main()
