"""
Auth tests — login success/failure, protected route 401, doctor->admin 403.
"""


class TestLogin:
    def test_self_registration_creates_unverified_doctor_and_sends_hashed_otp(self, client, otp_codes, db):
        from database.models.user import User
        from database.models.email_otp_challenge import EmailOtpChallenge

        response = client.post("/api/auth/register", json={
            "full_name": "Registered Doctor", "email": "new@test.com",
            "password": "SecurePass123", "role": "admin",
        })
        assert response.status_code == 202
        assert response.json()["email"] == "new@test.com"
        assert "otp" not in response.json()
        user = db.query(User).filter_by(email="new@test.com").one()
        assert user.role == "doctor"
        assert user.email_verified is False
        assert otp_codes[("new@test.com", "email_verification")]
        challenge = db.query(EmailOtpChallenge).filter_by(user_id=user.user_id).one()
        assert challenge.code_hash != otp_codes[("new@test.com", "email_verification")]

    def test_registration_of_verified_email_rejected(self, client, otp_codes, admin_user):
        payload = {"full_name": "Registered Doctor", "email": "new@test.com", "password": "SecurePass123"}
        payload["email"] = "admin@test.com"
        assert client.post("/api/auth/register", json=payload).status_code == 409

    def test_registration_requires_configured_email_delivery(self, client, monkeypatch):
        from backend.app.routes import auth_routes

        monkeypatch.setattr(auth_routes, "email_delivery_configured", lambda: False)
        response = client.post("/api/auth/register", json={
            "full_name": "Registered Doctor", "email": "new@test.com", "password": "SecurePass123"
        })
        assert response.status_code == 503

    def test_login_success(self, client, admin_user):
        response = client.post(
            "/api/auth/login",
            data={"username": "admin@test.com", "password": "Admin@123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "admin@test.com"
        assert "password_hash" not in data["user"]

    def test_unverified_account_cannot_login(self, client, otp_codes):
        client.post("/api/auth/register", json={
            "full_name": "Pending Doctor", "email": "pending@test.com", "password": "SecurePass123"
        })
        response = client.post("/api/auth/login", data={
            "username": "pending@test.com", "password": "SecurePass123"
        })
        assert response.status_code == 403

    def test_email_verification_is_single_use(self, client, otp_codes):
        client.post("/api/auth/register", json={
            "full_name": "Pending Doctor", "email": "pending@test.com", "password": "SecurePass123"
        })
        code = otp_codes[("pending@test.com", "email_verification")]
        response = client.post("/api/auth/verify-email", json={"email": "pending@test.com", "otp": code})
        assert response.status_code == 200
        assert client.post("/api/auth/verify-email", json={"email": "pending@test.com", "otp": code}).status_code == 400
        assert client.post("/api/auth/login", data={
            "username": "pending@test.com", "password": "SecurePass123"
        }).status_code == 200

    def test_password_reset_uses_otp_updates_password_and_revokes_old_token(self, client, otp_codes, doctor_user, db):
        from backend.app.routes.auth_routes import create_access_token

        old_token = create_access_token({"sub": str(doctor_user.user_id), "ver": doctor_user.token_version})
        response = client.post("/api/auth/forgot-password", json={"email": doctor_user.email})
        assert response.status_code == 200
        code = otp_codes[(doctor_user.email, "password_reset")]
        wrong = client.post("/api/auth/reset-password", json={
            "email": doctor_user.email, "otp": "000000", "new_password": "NewSecurePass123"
        })
        assert wrong.status_code == 400
        reset = client.post("/api/auth/reset-password", json={
            "email": doctor_user.email, "otp": code, "new_password": "NewSecurePass123"
        })
        assert reset.status_code == 200
        assert client.post("/api/auth/login", data={
            "username": doctor_user.email, "password": "Doctor@123"
        }).status_code == 401
        assert client.post("/api/auth/login", data={
            "username": doctor_user.email, "password": "NewSecurePass123"
        }).status_code == 200
        assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"}).status_code == 401

    def test_resend_is_rate_limited_without_revealing_account_state(self, client, otp_codes):
        email = "pending@test.com"
        client.post("/api/auth/register", json={
            "full_name": "Pending Doctor", "email": email, "password": "SecurePass123"
        })
        first = client.post("/api/auth/resend-verification", json={"email": email})
        second = client.post("/api/auth/resend-verification", json={"email": "unknown@test.com"})
        assert first.status_code == second.status_code == 200
        assert first.json()["message"] == second.json()["message"]
        assert list(otp_codes) == [(email, "email_verification")]

    def test_otp_locks_after_maximum_incorrect_attempts(self, client, otp_codes):
        email = "pending@test.com"
        client.post("/api/auth/register", json={
            "full_name": "Pending Doctor", "email": email, "password": "SecurePass123"
        })
        for _ in range(5):
            assert client.post("/api/auth/verify-email", json={"email": email, "otp": "000000"}).status_code == 400
        valid_code = otp_codes[(email, "email_verification")]
        assert client.post("/api/auth/verify-email", json={"email": email, "otp": valid_code}).status_code == 400

    def test_authenticated_password_change_requires_code_and_revokes_previous_token(
        self, client, doctor_user, auth_headers_doctor, otp_codes
    ):
        request = client.post("/api/auth/password-change-otp", headers=auth_headers_doctor)
        assert request.status_code == 200
        code = otp_codes[(doctor_user.email, "password_change")]
        response = client.put("/api/auth/password", headers=auth_headers_doctor, json={
            "current_password": "Doctor@123", "new_password": "ChangedPass123", "otp": code
        })
        assert response.status_code == 200
        assert client.get("/api/auth/me", headers=auth_headers_doctor).status_code == 401
        assert client.post("/api/auth/login", data={
            "username": doctor_user.email, "password": "ChangedPass123"
        }).status_code == 200

    def test_forgot_password_response_does_not_disclose_unknown_email(self, client, otp_codes):
        response = client.post("/api/auth/forgot-password", json={"email": "unknown@test.com"})
        assert response.status_code == 200
        assert response.json()["message"] == "If an account exists for this email, a password reset code has been sent."

    def test_login_wrong_password(self, client, admin_user):
        response = client.post(
            "/api/auth/login",
            data={"username": "admin@test.com", "password": "wrong"},
        )
        assert response.status_code == 401
        assert "Incorrect" in response.json()["detail"]

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/api/auth/login",
            data={"username": "nobody@test.com", "password": "whatever"},
        )
        assert response.status_code == 401


class TestProtectedRoutes:
    def test_me_without_token_returns_401(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_me_with_valid_token(self, client, auth_headers_admin, admin_user):
        response = client.get("/api/auth/me", headers=auth_headers_admin)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@test.com"
        assert "password_hash" not in data

    def test_doctor_cannot_access_admin_route(self, client, auth_headers_doctor, doctor_user):
        response = client.get("/api/auth/users", headers=auth_headers_doctor)
        assert response.status_code == 403

    def test_admin_can_list_users(self, client, auth_headers_admin, admin_user):
        response = client.get("/api/auth/users", headers=auth_headers_admin)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_admin_can_create_user(self, client, auth_headers_admin, admin_user):
        response = client.post(
            "/api/auth/users",
            headers=auth_headers_admin,
            json={
                "full_name": "New Doctor",
                "email": "newdoc@test.com",
                "password": "NewDoc@123",
                "role": "doctor",
            },
        )
        assert response.status_code == 201
        assert response.json()["email"] == "newdoc@test.com"
