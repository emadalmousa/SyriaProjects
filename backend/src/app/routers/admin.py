from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.notifications import create_notification
from app.core.permissions import is_admin
from app.models.notification import SystemNotification, NotificationType
from app.models.project import (
    Project, ProjectMember, ProjectInterest, ProjectBudgetItem, ProjectMilestone,
    ProjectUpdate, ProjectRole, ProjectStatus, InterestStatus, InterestType,
)
from app.models.user import User
from app.routers.users import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

TEST_EMAIL_DOMAIN = "@syriaprojects.sy"


def require_admin(current_user: User = Depends(get_current_user)):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    return current_user


def _get_test_user_ids(db: Session) -> list[int]:
    return [r[0] for r in db.query(User.id).filter(User.email.like(f"%{TEST_EMAIL_DOMAIN}")).all()]


def _get_test_project_ids(db: Session, test_user_ids: list[int]) -> list[int]:
    if not test_user_ids:
        return []
    return [r[0] for r in db.query(Project.id).filter(Project.created_by_user_id.in_(test_user_ids)).all()]


@router.get("/test-data/status")
def test_data_status(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    test_user_ids = _get_test_user_ids(db)
    test_project_ids = _get_test_project_ids(db, test_user_ids)
    return {
        "exists": len(test_user_ids) > 0,
        "users": len(test_user_ids),
        "projects": len(test_project_ids),
    }


@router.post("/test-data/seed")
def seed_test_data(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if _get_test_user_ids(db):
        raise HTTPException(status_code=400, detail="Test data already exists")
    from app.seed_demo import seed
    seed()
    test_user_ids = _get_test_user_ids(db)
    test_project_ids = _get_test_project_ids(db, test_user_ids)
    return {"status": "seeded", "users": len(test_user_ids), "projects": len(test_project_ids)}


@router.delete("/test-data")
def delete_test_data(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    test_user_ids = _get_test_user_ids(db)
    test_project_ids = _get_test_project_ids(db, test_user_ids)

    if test_project_ids:
        db.query(ProjectUpdate).filter(ProjectUpdate.project_id.in_(test_project_ids)).delete(synchronize_session=False)
        db.query(ProjectMilestone).filter(ProjectMilestone.project_id.in_(test_project_ids)).delete(synchronize_session=False)
        db.query(ProjectBudgetItem).filter(ProjectBudgetItem.project_id.in_(test_project_ids)).delete(synchronize_session=False)
        db.query(ProjectInterest).filter(ProjectInterest.project_id.in_(test_project_ids)).delete(synchronize_session=False)
        db.query(ProjectMember).filter(ProjectMember.project_id.in_(test_project_ids)).delete(synchronize_session=False)
        db.query(Project).filter(Project.id.in_(test_project_ids)).delete(synchronize_session=False)

    if test_user_ids:
        db.query(ProjectMember).filter(ProjectMember.user_id.in_(test_user_ids)).delete(synchronize_session=False)
        db.query(ProjectInterest).filter(ProjectInterest.user_id.in_(test_user_ids)).delete(synchronize_session=False)
        db.query(ProjectUpdate).filter(ProjectUpdate.created_by_user_id.in_(test_user_ids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(test_user_ids)).delete(synchronize_session=False)

    db.commit()
    return {"status": "deleted", "users_deleted": len(test_user_ids), "projects_deleted": len(test_project_ids)}


@router.get("/tasks")
def get_admin_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    idea_projects = db.query(Project).filter(Project.status == ProjectStatus.IDEA).order_by(Project.created_at.desc()).all()
    pending_interests = (
        db.query(ProjectInterest)
        .filter(
            ProjectInterest.status == InterestStatus.PENDING,
            ProjectInterest.interest_type == InterestType.INVESTMENT,
        )
        .order_by(ProjectInterest.created_at.desc())
        .all()
    )
    return {
        "idea_projects": [
            {
                "id": p.id,
                "title": p.title,
                "short_description": p.short_description,
                "category": p.category,
                "city": p.city,
                "created_at": p.created_at.isoformat(),
                "creator": db.get(User, p.created_by_user_id).full_name if p.created_by_user_id else None,
            }
            for p in idea_projects
        ],
        "pending_interests": [
            {
                "id": i.id,
                "project_id": i.project_id,
                "project_title": db.get(Project, i.project_id).title if i.project_id else None,
                "user_id": i.user_id,
                "user_name": db.get(User, i.user_id).full_name if i.user_id else None,
                "user_email": db.get(User, i.user_id).email if i.user_id else None,
                "amount": float(i.amount) if i.amount else None,
                "created_at": i.created_at.isoformat(),
            }
            for i in pending_interests
        ],
    }


class ProjectDecision(BaseModel):
    rejection_reason: str | None = None


@router.post("/projects/{project_id}/approve")
def approve_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    project.status = ProjectStatus.ACTIVE
    create_notification(db, NotificationType.PROJECT_APPROVED, actor=current_user, project=project)
    db.commit()
    return {"message": "Projekt akzeptiert", "status": "ACTIVE"}


@router.post("/projects/{project_id}/reject")
def reject_project(
    project_id: int,
    data: ProjectDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    project.status = ProjectStatus.REJECTED
    if data.rejection_reason:
        project.rejection_reason = data.rejection_reason
    create_notification(db, NotificationType.PROJECT_REJECTED, actor=current_user, project=project)
    db.commit()
    return {"message": "Projekt abgelehnt", "status": "REJECTED"}


@router.post("/interests/{interest_id}/approve")
def approve_interest(
    interest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    interest = db.get(ProjectInterest, interest_id)
    if not interest:
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
    interest.status = InterestStatus.ACCEPTED
    project = db.get(Project, interest.project_id)
    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == interest.project_id,
        ProjectMember.user_id == interest.user_id,
    ).first()
    if not existing_member:
        db.add(ProjectMember(
            project_id=interest.project_id,
            user_id=interest.user_id,
            project_role=ProjectRole.PROJECT_INVESTOR,
        ))
    if interest.amount and project:
        project.own_capital = (project.own_capital or Decimal("0")) + interest.amount
    actor = db.get(User, interest.user_id)
    create_notification(db, NotificationType.JOIN_ACCEPTED, actor=actor, project=project, interest=interest)
    db.commit()
    return {"message": "Teilnahme bestätigt"}


@router.post("/interests/{interest_id}/reject")
def reject_interest(
    interest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    interest = db.get(ProjectInterest, interest_id)
    if not interest:
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
    interest.status = InterestStatus.REJECTED
    project = db.get(Project, interest.project_id)
    actor = db.get(User, interest.user_id)
    create_notification(db, NotificationType.JOIN_REJECTED, actor=actor, project=project, interest=interest)
    db.commit()
    return {"message": "Teilnahme abgelehnt"}


@router.get("/notifications")
def get_notifications(
    unread_only: bool = False,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = db.query(SystemNotification)
    if unread_only:
        query = query.filter(SystemNotification.is_read == False)  # noqa: E712
    notifications = query.order_by(SystemNotification.created_at.desc()).limit(limit).all()
    result = []
    for n in notifications:
        actor = db.get(User, n.actor_id) if n.actor_id else None
        project = db.get(Project, n.project_id) if n.project_id else None
        result.append({
            "id": n.id,
            "type": n.type,
            "message": n.message,
            "actor_name": actor.full_name if actor else None,
            "project_id": n.project_id,
            "project_title": project.title if project else None,
            "interest_id": n.interest_id,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        })
    return result


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    n = db.get(SystemNotification, notification_id)
    if not n:
        raise HTTPException(status_code=404, detail="Meldung nicht gefunden")
    n.is_read = True
    db.commit()
    return {"message": "Als gelesen markiert"}


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    db.query(SystemNotification).filter(SystemNotification.is_read == False).update({"is_read": True})  # noqa: E712
    db.commit()
    return {"message": "Alle als gelesen markiert"}
