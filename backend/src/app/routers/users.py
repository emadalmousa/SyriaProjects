from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import is_admin
from app.core.security import decode_access_token
from app.models.project import Project, ProjectInterest, InterestType
from app.models.user import User
from app.schemas.user import UserProfileUpdate, UserResponse, UserRoleUpdate

router = APIRouter(prefix="/users", tags=["users"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_profile(
    data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.first_name is not None:
        current_user.first_name = data.first_name
    if data.last_name is not None:
        current_user.last_name = data.last_name
    if data.phone is not None:
        current_user.phone = data.phone
    if data.country is not None:
        current_user.country = data.country
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    data: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only admins can change roles")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.global_role = data.global_role
    db.commit()
    db.refresh(user)
    return user


@router.get("/", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only admins can list users")
    return db.query(User).all()


@router.get("/me/interests")
def get_my_interests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interests = (
        db.query(ProjectInterest)
        .filter(
            ProjectInterest.user_id == current_user.id,
            ProjectInterest.interest_type == InterestType.INVESTMENT,
        )
        .order_by(ProjectInterest.created_at.desc())
        .all()
    )
    result = []
    for i in interests:
        project = db.get(Project, i.project_id)
        result.append({
            "id": i.id,
            "project_id": i.project_id,
            "project_title": project.title if project else "Unbekannt",
            "project_status": project.status if project else None,
            "amount": float(i.amount) if i.amount else None,
            "status": i.status,
            "created_at": i.created_at.isoformat(),
        })
    return result


@router.patch("/{user_id}/active", response_model=UserResponse)
def set_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only admins can block users")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user
