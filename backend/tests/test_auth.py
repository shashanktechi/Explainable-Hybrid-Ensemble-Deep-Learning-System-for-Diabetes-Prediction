"""
Auth tests — login success/failure, protected route 401, doctor->admin route 403.
"""


class TestLogin:
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

    def test_doctor_cannot_access_admin_route(self, client, auth_headers_doctor):
        """Doctor trying to list users (admin-only) gets 403."""
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
