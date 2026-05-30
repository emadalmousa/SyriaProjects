import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.core.email import get_email_service
from app.main import app

TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class MockEmailService:
    def __init__(self):
        self._tokens: dict[str, str] = {}

    def send_verification_email(self, email: str, token: str) -> None:
        self._tokens[f"verify:{email}"] = token

    def send_password_reset_email(self, email: str, token: str) -> None:
        self._tokens[f"reset:{email}"] = token

    def get_verification_token(self, email: str) -> str | None:
        return self._tokens.get(f"verify:{email}")

    def get_reset_token(self, email: str) -> str | None:
        return self._tokens.get(f"reset:{email}")

    def clear(self) -> None:
        self._tokens.clear()


mock_email_svc = MockEmailService()


@pytest.fixture(autouse=True)
def reset_email_mock():
    mock_email_svc.clear()
    yield


@pytest.fixture(scope="function", autouse=False)
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_email_service] = lambda: mock_email_svc

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def register_and_login(client, email, password="testpass1"):
    """Register, verify email, and login. Returns auth headers."""
    client.post("/auth/register", json={"email": email, "password": password})
    token = mock_email_svc.get_verification_token(email)
    client.get(f"/auth/verify-email?token={token}")
    resp = client.post("/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
