import threading
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.core.email import get_email_service
from app.main import app
from app.models.user import GlobalRole, User
from test.conftest import MockEmailService, mock_email_svc


# ── Registration & first-admin ────────────────────────────────────────────────

def test_first_registration_becomes_admin(client):
    resp = client.post("/auth/register", json={"email": "first@test.com", "password": "password1"})
    assert resp.status_code == 201
    assert resp.json()["global_role"] == "ADMIN"


def test_second_registration_becomes_user(client):
    client.post("/auth/register", json={"email": "first@test.com", "password": "password1"})
    resp = client.post("/auth/register", json={"email": "second@test.com", "password": "password1"})
    assert resp.status_code == 201
    assert resp.json()["global_role"] == "USER"


def test_client_cannot_set_role_admin(client):
    # First user is ADMIN regardless of payload
    client.post("/auth/register", json={"email": "first@test.com", "password": "password1"})
    # Second user tries to send role=ADMIN — must be ignored
    resp = client.post(
        "/auth/register",
        json={"email": "attacker@test.com", "password": "password1", "global_role": "ADMIN"},
    )
    assert resp.status_code == 201
    assert resp.json()["global_role"] == "USER"


def test_new_user_is_not_email_verified(client):
    resp = client.post("/auth/register", json={"email": "new@test.com", "password": "password1"})
    assert resp.status_code == 201
    # email_verified is not in UserResponse by design, but login must fail
    login = client.post("/auth/login", json={"email": "new@test.com", "password": "password1"})
    assert login.status_code == 403
    assert login.json()["detail"] == "EMAIL_NOT_VERIFIED"


def test_register_sends_verification_email(client):
    client.post("/auth/register", json={"email": "new@test.com", "password": "password1"})
    assert mock_email_svc.get_verification_token("new@test.com") is not None


# ── Email verification ─────────────────────────────────────────────────────────

def test_valid_token_activates_user(client):
    client.post("/auth/register", json={"email": "user@test.com", "password": "password1"})
    token = mock_email_svc.get_verification_token("user@test.com")
    resp = client.get(f"/auth/verify-email?token={token}")
    assert resp.status_code == 200
    # Login now works
    login = client.post("/auth/login", json={"email": "user@test.com", "password": "password1"})
    assert login.status_code == 200
    assert "access_token" in login.json()


def test_invalid_token_rejected(client):
    resp = client.get("/auth/verify-email?token=invalidtoken123")
    assert resp.status_code == 400


def test_expired_token_rejected(client, db):
    from datetime import datetime, timezone
    client.post("/auth/register", json={"email": "user@test.com", "password": "password1"})
    # Manually expire the token
    from app.models.token import AuthToken
    auth_token = db.query(AuthToken).first()
    auth_token.expires_at = datetime(2000, 1, 1, tzinfo=timezone.utc)
    db.commit()
    raw_token = mock_email_svc.get_verification_token("user@test.com")
    resp = client.get(f"/auth/verify-email?token={raw_token}")
    assert resp.status_code == 400
    assert "abgelaufen" in resp.json()["detail"]


def test_used_token_rejected(client):
    client.post("/auth/register", json={"email": "user@test.com", "password": "password1"})
    token = mock_email_svc.get_verification_token("user@test.com")
    client.get(f"/auth/verify-email?token={token}")  # first use: OK
    resp = client.get(f"/auth/verify-email?token={token}")  # second use: rejected
    assert resp.status_code == 400


def test_login_without_verified_email_rejected(client):
    client.post("/auth/register", json={"email": "unverified@test.com", "password": "password1"})
    resp = client.post("/auth/login", json={"email": "unverified@test.com", "password": "password1"})
    assert resp.status_code == 403
    assert resp.json()["detail"] == "EMAIL_NOT_VERIFIED"


def test_login_after_verification_succeeds(client):
    client.post("/auth/register", json={"email": "user@test.com", "password": "password1"})
    token = mock_email_svc.get_verification_token("user@test.com")
    client.get(f"/auth/verify-email?token={token}")
    resp = client.post("/auth/login", json={"email": "user@test.com", "password": "password1"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


# ── Resend verification ────────────────────────────────────────────────────────

def test_resend_gives_new_token(client):
    client.post("/auth/register", json={"email": "user@test.com", "password": "password1"})
    old_token = mock_email_svc.get_verification_token("user@test.com")

    mock_email_svc.clear()
    client.post("/auth/resend-verification", json={"email": "user@test.com"})
    new_token = mock_email_svc.get_verification_token("user@test.com")

    assert new_token is not None
    assert new_token != old_token


def test_resend_old_token_invalidated(client):
    client.post("/auth/register", json={"email": "user@test.com", "password": "password1"})
    old_token = mock_email_svc.get_verification_token("user@test.com")

    client.post("/auth/resend-verification", json={"email": "user@test.com"})
    # Old token must no longer work
    resp = client.get(f"/auth/verify-email?token={old_token}")
    assert resp.status_code == 400


def test_resend_already_verified_returns_neutral(client):
    client.post("/auth/register", json={"email": "user@test.com", "password": "password1"})
    token = mock_email_svc.get_verification_token("user@test.com")
    client.get(f"/auth/verify-email?token={token}")

    mock_email_svc.clear()
    resp = client.post("/auth/resend-verification", json={"email": "user@test.com"})
    assert resp.status_code == 200
    assert mock_email_svc.get_verification_token("user@test.com") is None


# ── Password reset ─────────────────────────────────────────────────────────────

def _register_and_verify(client, email, password="password1"):
    client.post("/auth/register", json={"email": email, "password": password})
    token = mock_email_svc.get_verification_token(email)
    client.get(f"/auth/verify-email?token={token}")


def test_forgot_password_neutral_response(client):
    resp = client.post("/auth/forgot-password", json={"email": "nobody@test.com"})
    assert resp.status_code == 200
    assert "gesendet" in resp.json()["message"]


def test_forgot_password_creates_reset_token(client):
    _register_and_verify(client, "user@test.com")
    mock_email_svc.clear()
    client.post("/auth/forgot-password", json={"email": "user@test.com"})
    assert mock_email_svc.get_reset_token("user@test.com") is not None


def test_forgot_password_sends_email(client):
    _register_and_verify(client, "user@test.com")
    mock_email_svc.clear()
    client.post("/auth/forgot-password", json={"email": "user@test.com"})
    assert mock_email_svc.get_reset_token("user@test.com") is not None


def test_reset_password_valid_token(client):
    _register_and_verify(client, "user@test.com")
    client.post("/auth/forgot-password", json={"email": "user@test.com"})
    reset_token = mock_email_svc.get_reset_token("user@test.com")

    resp = client.post("/auth/reset-password", json={
        "token": reset_token,
        "new_password": "newpassword1",
        "confirm_password": "newpassword1",
    })
    assert resp.status_code == 200

    login = client.post("/auth/login", json={"email": "user@test.com", "password": "newpassword1"})
    assert login.status_code == 200


def test_reset_password_wrong_confirm(client):
    _register_and_verify(client, "user@test.com")
    client.post("/auth/forgot-password", json={"email": "user@test.com"})
    reset_token = mock_email_svc.get_reset_token("user@test.com")

    resp = client.post("/auth/reset-password", json={
        "token": reset_token,
        "new_password": "newpassword1",
        "confirm_password": "different1",
    })
    assert resp.status_code == 400


def test_reset_password_expired_token(client, db):
    from datetime import datetime, timezone
    _register_and_verify(client, "user@test.com")
    client.post("/auth/forgot-password", json={"email": "user@test.com"})
    reset_token = mock_email_svc.get_reset_token("user@test.com")

    from app.models.token import AuthToken, TokenType
    auth_token = db.query(AuthToken).filter(AuthToken.token_type == TokenType.PASSWORD_RESET).first()
    auth_token.expires_at = datetime(2000, 1, 1, tzinfo=timezone.utc)
    db.commit()

    resp = client.post("/auth/reset-password", json={
        "token": reset_token,
        "new_password": "newpassword1",
        "confirm_password": "newpassword1",
    })
    assert resp.status_code == 400


def test_reset_password_invalid_token(client):
    resp = client.post("/auth/reset-password", json={
        "token": "invalidtoken",
        "new_password": "newpassword1",
        "confirm_password": "newpassword1",
    })
    assert resp.status_code == 400


def test_reset_token_cannot_be_used_twice(client):
    _register_and_verify(client, "user@test.com")
    client.post("/auth/forgot-password", json={"email": "user@test.com"})
    reset_token = mock_email_svc.get_reset_token("user@test.com")

    client.post("/auth/reset-password", json={
        "token": reset_token,
        "new_password": "newpassword1",
        "confirm_password": "newpassword1",
    })
    # Second use
    resp = client.post("/auth/reset-password", json={
        "token": reset_token,
        "new_password": "anotherpass1",
        "confirm_password": "anotherpass1",
    })
    assert resp.status_code == 400


def test_reset_password_is_hashed(client, db):
    _register_and_verify(client, "user@test.com")
    client.post("/auth/forgot-password", json={"email": "user@test.com"})
    reset_token = mock_email_svc.get_reset_token("user@test.com")

    client.post("/auth/reset-password", json={
        "token": reset_token,
        "new_password": "newpassword1",
        "confirm_password": "newpassword1",
    })

    user = db.query(User).filter(User.email == "user@test.com").first()
    assert user.hashed_password != "newpassword1"
    assert user.hashed_password.startswith("$2b$")


# ── Login ─────────────────────────────────────────────────────────────────────

def test_login_wrong_password(client):
    _register_and_verify(client, "c@test.com", password="correct1!")
    resp = client.post("/auth/login", json={"email": "c@test.com", "password": "wrong"})
    assert resp.status_code == 401


# ── Concurrent registration ───────────────────────────────────────────────────

def test_concurrent_registration_produces_one_admin():
    """Exactly one ADMIN regardless of concurrent registrations."""
    concurrent_engine = create_engine(
        "sqlite:///./test_concurrent.db",
        connect_args={"check_same_thread": False},
    )
    ConcurrentSession = sessionmaker(autocommit=False, autoflush=False, bind=concurrent_engine)
    Base.metadata.create_all(bind=concurrent_engine)

    noop_email = MockEmailService()

    def override_get_db():
        db = ConcurrentSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_email_service] = lambda: noop_email
    errors = []

    def register(email):
        try:
            with TestClient(app) as c:
                c.post("/auth/register", json={"email": email, "password": "password1"})
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=register, args=(f"user{i}@test.com",)) for i in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    app.dependency_overrides.clear()

    check_db = ConcurrentSession()
    try:
        admins = check_db.query(User).filter(User.global_role == GlobalRole.ADMIN).all()
        assert len(admins) == 1, f"Expected 1 admin, got {len(admins)}"
    finally:
        check_db.close()
        Base.metadata.drop_all(bind=concurrent_engine)

    assert not errors
