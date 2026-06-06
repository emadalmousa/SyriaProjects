from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.project import ProjectMember, ProjectRole
from app.models.user import GlobalRole, User


SUPERADMIN_EMAIL = "almousa.emad.92@gmail.com"


def is_superadmin(user: User) -> bool:
    return user.global_role == GlobalRole.SUPERADMIN


def is_admin(user: User) -> bool:
    return user.global_role in (GlobalRole.ADMIN, GlobalRole.SUPERADMIN)


def get_project_role(db: Session, user_id: int, project_id: int) -> ProjectRole | None:
    member = (
        db.query(ProjectMember)
        .filter(ProjectMember.user_id == user_id, ProjectMember.project_id == project_id)
        .first()
    )
    return member.project_role if member else None


def has_project_role(db: Session, user_id: int, project_id: int, roles: list[ProjectRole]) -> bool:
    role = get_project_role(db, user_id, project_id)
    return role in roles


def can_manage_project(user: User, db: Session, project_id: int) -> bool:
    if is_admin(user):
        return True
    return has_project_role(db, user.id, project_id, [
        ProjectRole.PROJECT_OWNER,
        ProjectRole.PROJECT_ADMIN,
        ProjectRole.PROJECT_MANAGER,
    ])


def can_view_project(user: User, db: Session, project_id: int) -> bool:
    if is_admin(user):
        return True
    return has_project_role(db, user.id, project_id, [
        ProjectRole.PROJECT_OWNER,
        ProjectRole.PROJECT_ADMIN,
        ProjectRole.PROJECT_MANAGER,
        ProjectRole.PROJECT_INVESTOR,
    ])


def require_project_roles(user: User, db: Session, project_id: int, roles: list[ProjectRole]):
    if is_admin(user):
        return
    if not has_project_role(db, user.id, project_id, roles):
        raise HTTPException(status_code=403, detail="Insufficient project permissions")
