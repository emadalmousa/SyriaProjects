import secrets
import threading
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.email import EmailService, get_email_service
from app.core.security import create_access_token, hash_password, verify_password
from app.models.token import AuthToken, TokenType
from app.models.user import GlobalRole, User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.user import GoogleAuthRequest, UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

_first_admin_lock = threading.Lock()


def _assign_role(db: Session) -> GlobalRole:
    admin_exists = (
        db.query(User)
        .filter(User.global_role == GlobalRole.ADMIN)
        .with_for_update()
        .first()
    )
    return GlobalRole.USER if admin_exists else GlobalRole.ADMIN


def _create_auth_token(db: Session, user_id: int, token_type: TokenType, expires_delta: timedelta) -> str:
    # Invalidate existing unused tokens of same type for this user
    db.query(AuthToken).filter(
        AuthToken.user_id == user_id,
        AuthToken.token_type == token_type,
        AuthToken.used_at.is_(None),
    ).delete(synchronize_session=False)

    raw_token = secrets.token_urlsafe(32)
    auth_token = AuthToken(
        token=raw_token,
        token_type=token_type,
        user_id=user_id,
        expires_at=datetime.now(timezone.utc) + expires_delta,
    )
    db.add(auth_token)
    db.flush()  # get the token into DB within current transaction
    return raw_token


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    data: UserCreate,
    db: Session = Depends(get_db),
    email_svc: EmailService = Depends(get_email_service),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    with _first_admin_lock:
        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
            phone=data.phone,
            country=data.country,
            user_type=data.user_type,
            global_role=_assign_role(db),
            email_verified=False,
        )
        db.add(user)
        db.flush()

        token = _create_auth_token(
            db, user.id, TokenType.EMAIL_VERIFICATION,
            timedelta(hours=settings.email_verification_expire_hours),
        )
        db.commit()

    db.refresh(user)
    email_svc.send_verification_email(user.email, token)
    return user


@router.get("/verify-email", response_model=MessageResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    auth_token = (
        db.query(AuthToken)
        .filter(
            AuthToken.token == token,
            AuthToken.token_type == TokenType.EMAIL_VERIFICATION,
            AuthToken.used_at.is_(None),
        )
        .first()
    )
    if not auth_token:
        raise HTTPException(status_code=400, detail="Ungültiger oder bereits benutzter Token")

    # expires_at may be naive or aware depending on DB
    expires_at = auth_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        raise HTTPException(status_code=400, detail="Token abgelaufen")

    user = db.query(User).filter(User.id == auth_token.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Benutzer nicht gefunden")

    user.email_verified = True
    auth_token.used_at = now
    db.commit()
    return MessageResponse(message="E-Mail-Adresse erfolgreich bestätigt")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(
    data: ResendVerificationRequest,
    db: Session = Depends(get_db),
    email_svc: EmailService = Depends(get_email_service),
):
    user = db.query(User).filter(User.email == data.email).first()
    # Always return neutral message to prevent email enumeration
    neutral = MessageResponse(
        message="Falls ein unbestätigtes Konto mit dieser E-Mail existiert, wurde eine neue Bestätigungs-E-Mail gesendet."
    )
    if not user or user.email_verified:
        return neutral

    token = _create_auth_token(
        db, user.id, TokenType.EMAIL_VERIFICATION,
        timedelta(hours=settings.email_verification_expire_hours),
    )
    db.commit()
    email_svc.send_verification_email(user.email, token)
    return neutral


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="EMAIL_NOT_VERIFIED")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Konto deaktiviert")
    token = create_access_token({"sub": str(user.id), "role": user.global_role})
    return TokenResponse(access_token=token)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
    email_svc: EmailService = Depends(get_email_service),
):
    neutral = MessageResponse(
        message="Wenn ein Konto mit dieser E-Mail existiert, wurde eine E-Mail zum Zurücksetzen gesendet."
    )
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return neutral

    token = _create_auth_token(
        db, user.id, TokenType.PASSWORD_RESET,
        timedelta(minutes=settings.password_reset_expire_minutes),
    )
    db.commit()
    email_svc.send_password_reset_email(user.email, token)
    return neutral


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwörter stimmen nicht überein")

    now = datetime.now(timezone.utc)
    auth_token = (
        db.query(AuthToken)
        .filter(
            AuthToken.token == data.token,
            AuthToken.token_type == TokenType.PASSWORD_RESET,
            AuthToken.used_at.is_(None),
        )
        .first()
    )
    if not auth_token:
        raise HTTPException(status_code=400, detail="Ungültiger oder bereits benutzter Token")

    expires_at = auth_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        raise HTTPException(status_code=400, detail="Token abgelaufen")

    user = db.query(User).filter(User.id == auth_token.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Benutzer nicht gefunden")

    user.hashed_password = hash_password(data.new_password)
    auth_token.used_at = now
    db.commit()
    return MessageResponse(message="Passwort erfolgreich zurückgesetzt")


@router.post("/google", response_model=TokenResponse)
def google_login(
    data: GoogleAuthRequest,
    db: Session = Depends(get_db),
    email_svc: EmailService = Depends(get_email_service),
):
    try:
        if settings.google_client_id:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests
            idinfo = google_id_token.verify_oauth2_token(
                data.id_token,
                google_requests.Request(),
                settings.google_client_id,
            )
        else:
            import httpx
            r = httpx.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={data.id_token}")
            if r.status_code != 200:
                raise ValueError("Invalid token")
            idinfo = r.json()
    except Exception:
        raise HTTPException(status_code=401, detail="Ungültiger Google Token")

    email = idinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="E-Mail nicht von Google bereitgestellt")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        with _first_admin_lock:
            user = User(
                email=email,
                first_name=idinfo.get("given_name"),
                last_name=idinfo.get("family_name"),
                avatar_url=idinfo.get("picture"),
                oauth_provider="google",
                global_role=_assign_role(db),
                email_verified=True,  # Google already verified the email
            )
            db.add(user)
            db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Konto deaktiviert")

    token = create_access_token({"sub": str(user.id), "role": user.global_role})
    return TokenResponse(access_token=token)
