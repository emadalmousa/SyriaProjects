from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.notifications import create_notification
from app.core.permissions import is_admin
from app.models.admin_request import AdminRequest, RequestStatus as AdminReqStatus, RequestType
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
    pending_requests = (
        db.query(AdminRequest)
        .filter(AdminRequest.status == AdminReqStatus.PENDING)
        .order_by(AdminRequest.created_at.desc())
        .all()
    )
    requests_list = []
    for r in pending_requests:
        requester = db.get(User, r.requester_id)
        project = db.get(Project, r.project_id) if r.project_id else None
        requests_list.append({
            "id": r.id,
            "type": r.type,
            "status": r.status,
            "requester_name": requester.full_name if requester else None,
            "project_id": r.project_id,
            "project_title": project.title if project else None,
            "interest_id": r.interest_id,
            "payload": r.payload,
            "created_at": r.created_at.isoformat(),
        })
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
        "pending_requests": requests_list,
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


class RequestRejection(BaseModel):
    admin_note: str | None = None


@router.post("/requests/{request_id}/approve")
def approve_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    import json as _json
    from decimal import Decimal as _Decimal

    req = db.get(AdminRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
    if req.status != AdminReqStatus.PENDING:
        raise HTTPException(status_code=400, detail="Anfrage ist nicht mehr ausstehend")

    project = db.get(Project, req.project_id) if req.project_id else None
    interest = db.get(ProjectInterest, req.interest_id) if req.interest_id else None
    requester = db.get(User, req.requester_id)
    payload = _json.loads(req.payload) if req.payload else {}

    if req.type == RequestType.CHANGE_PARTICIPATION and interest:
        new_amount = _Decimal(str(payload.get("amount", interest.amount or 0)))
        old_amount = _Decimal(str(payload.get("old_amount", interest.amount or 0)))
        diff = new_amount - old_amount
        interest.amount = new_amount
        if "message" in payload:
            interest.message = payload["message"]
        if project and diff != 0:
            project.own_capital = (_Decimal(str(project.own_capital or 0)) + diff)

    elif req.type == RequestType.WITHDRAW_PARTICIPATION and interest:
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == req.project_id,
            ProjectMember.user_id == req.requester_id,
        ).first()
        if member:
            db.delete(member)
        if interest.amount and project and project.own_capital:
            project.own_capital = max(
                _Decimal("0"),
                _Decimal(str(project.own_capital)) - _Decimal(str(interest.amount))
            )
        interest.status = InterestStatus.WITHDRAWN

    elif req.type == RequestType.CHANGE_PROJECT_DATA and project:
        field = payload.get("field")
        value = payload.get("value")
        if field and hasattr(project, field):
            setattr(project, field, value)

    elif req.type == RequestType.CHANGE_PROJECT_STATUS and project:
        field = payload.get("field")
        value = payload.get("value")
        if field == "cancel":
            project.status = ProjectStatus.CANCELLED
        elif field == "complete":
            project.status = ProjectStatus.COMPLETED
        elif field == "pause":
            project.status = ProjectStatus.PAUSED
        elif field == "status" and value:
            try:
                project.status = ProjectStatus(value)
            except ValueError:
                pass

    req.status = AdminReqStatus.ACCEPTED
    create_notification(db, NotificationType.REQUEST_ACCEPTED, actor=requester, project=project)
    db.commit()
    return {"message": "Anfrage akzeptiert"}


@router.post("/requests/{request_id}/reject")
def reject_request(
    request_id: int,
    data: RequestRejection,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    req = db.get(AdminRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
    if req.status != AdminReqStatus.PENDING:
        raise HTTPException(status_code=400, detail="Anfrage ist nicht mehr ausstehend")

    req.status = AdminReqStatus.REJECTED
    if data.admin_note:
        req.admin_note = data.admin_note

    project = db.get(Project, req.project_id) if req.project_id else None
    requester = db.get(User, req.requester_id)
    create_notification(db, NotificationType.REQUEST_REJECTED, actor=requester, project=project)
    db.commit()
    return {"message": "Anfrage abgelehnt"}


@router.get("/history")
def get_admin_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    reviewed_projects = (
        db.query(Project)
        .filter(Project.status.in_([ProjectStatus.ACTIVE, ProjectStatus.REJECTED]))
        .order_by(Project.updated_at.desc())
        .limit(100)
        .all()
    )
    reviewed_interests = (
        db.query(ProjectInterest)
        .filter(ProjectInterest.status.in_([InterestStatus.ACCEPTED, InterestStatus.REJECTED]))
        .order_by(ProjectInterest.updated_at.desc())
        .limit(100)
        .all()
    )
    reviewed_requests = (
        db.query(AdminRequest)
        .filter(AdminRequest.status.in_([AdminReqStatus.ACCEPTED, AdminReqStatus.REJECTED]))
        .order_by(AdminRequest.updated_at.desc())
        .limit(100)
        .all()
    )
    return {
        "reviewed_projects": [
            {
                "id": p.id,
                "title": p.title,
                "short_description": p.short_description,
                "city": p.city,
                "status": p.status,
                "creator": db.get(User, p.created_by_user_id).full_name if p.created_by_user_id else None,
                "created_at": p.created_at.isoformat(),
                "decided_at": p.updated_at.isoformat() if p.updated_at else p.created_at.isoformat(),
            }
            for p in reviewed_projects
        ],
        "reviewed_interests": [
            {
                "id": i.id,
                "project_id": i.project_id,
                "project_title": db.get(Project, i.project_id).title if i.project_id else None,
                "user_name": db.get(User, i.user_id).full_name if i.user_id else None,
                "user_email": db.get(User, i.user_id).email if i.user_id else None,
                "amount": float(i.amount) if i.amount else None,
                "status": i.status,
                "created_at": i.created_at.isoformat(),
                "decided_at": i.updated_at.isoformat() if i.updated_at else i.created_at.isoformat(),
            }
            for i in reviewed_interests
        ],
        "reviewed_requests": [
            {
                "id": r.id,
                "type": r.type,
                "status": r.status,
                "requester_name": db.get(User, r.requester_id).full_name if r.requester_id else None,
                "project_id": r.project_id,
                "project_title": db.get(Project, r.project_id).title if r.project_id else None,
                "payload": r.payload,
                "admin_note": r.admin_note,
                "created_at": r.created_at.isoformat(),
                "decided_at": r.updated_at.isoformat() if r.updated_at else r.created_at.isoformat(),
            }
            for r in reviewed_requests
        ],
    }


@router.post("/projects/{project_id}/reopen")
def reopen_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    project.status = ProjectStatus.IDEA
    db.commit()
    return {"message": "Projekt wieder geöffnet", "status": "IDEA"}


@router.post("/interests/{interest_id}/reopen")
def reopen_interest(
    interest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    interest = db.get(ProjectInterest, interest_id)
    if not interest:
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
    interest.status = InterestStatus.PENDING
    db.commit()
    return {"message": "Beitrittsanfrage wieder geöffnet"}


@router.post("/requests/{request_id}/reopen")
def reopen_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    req = db.get(AdminRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Anfrage nicht gefunden")
    req.status = AdminReqStatus.PENDING
    db.commit()
    return {"message": "Anfrage wieder geöffnet"}


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
