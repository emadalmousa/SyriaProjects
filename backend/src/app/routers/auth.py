from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserType
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import GoogleAuthRequest, UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        country=data.country,
        user_type=data.user_type,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id), "role": user.global_role})
    return TokenResponse(access_token=token)


@router.post("/google", response_model=TokenResponse)
def google_login(data: GoogleAuthRequest, db: Session = Depends(get_db)):
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
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = idinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            first_name=idinfo.get("given_name"),
            last_name=idinfo.get("family_name"),
            avatar_url=idinfo.get("picture"),
            oauth_provider="google",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.global_role})
    return TokenResponse(access_token=token)
