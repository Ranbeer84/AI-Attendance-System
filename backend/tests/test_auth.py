def test_login_success(client, test_teacher):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "teacher@example.com", "password": "StrongPass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, test_teacher):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "teacher@example.com", "password": "WrongPass"},
    )
    assert response.status_code == 401


def test_login_nonexistent_user(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "whatever"},
    )
    assert response.status_code == 401


def test_get_me_with_valid_token(client, test_teacher):
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "teacher@example.com", "password": "StrongPass123"},
    )
    token = login_response.json()["access_token"]

    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "teacher@example.com"


def test_get_me_without_token(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_refresh_token(client, test_teacher):
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "teacher@example.com", "password": "StrongPass123"},
    )
    refresh_token = login_response.json()["refresh_token"]

    refresh_response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_response.status_code == 200
    assert "access_token" in refresh_response.json()