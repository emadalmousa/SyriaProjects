def test_register_creates_user_role(client):
    resp = client.post("/auth/register", json={"email": "a@test.com", "password": "pass"})
    assert resp.status_code == 201
    assert resp.json()["global_role"] == "USER"


def test_login_returns_token(client):
    client.post("/auth/register", json={"email": "b@test.com", "password": "pass"})
    resp = client.post("/auth/login", json={"email": "b@test.com", "password": "pass"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client):
    client.post("/auth/register", json={"email": "c@test.com", "password": "correct"})
    resp = client.post("/auth/login", json={"email": "c@test.com", "password": "wrong"})
    assert resp.status_code == 401
