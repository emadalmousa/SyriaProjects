import json
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.notifications import create_notification
from app.models.admin_request import AdminRequest, RequestStatus, RequestType
from app.models.notification import NotificationType
from app.models.project import (
    InterestStatus, InterestType, Project, ProjectInterest, ProjectMember, ProjectStatus,
)
from app.routers.users import get_current_user
from app.models.user import User

router = APIRouter(prefix="/projects", tags=["participation"])

# Status where withdrawal requires admin approval
LATE_STAGE_STATUSES = {
    ProjectStatus.APPROVED,
    ProjectStatus.CONTRACT,
    ProjectStatus.FUNDED,
    ProjectStatus.COMPLETED,
}


class ParticipationChangeRequest(BaseModel):
    amount: Decimal | None = None
    message: str | None = None


class ProjectChangeRequest(BaseModel):
    field: str | None = None
    value: str | None = None
    changes: list[dict] | None = None


@router.patch("/{project_id}/participation")
def change_participation(
    project_id: int,
    data: ParticipationChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    interest = db.query(ProjectInterest).filter(
        ProjectInterest.project_id == project_id,
        ProjectInterest.user_id == current_user.id,
        ProjectInterest.interest_type == InterestType.INVESTMENT,
        ProjectInterest.status == InterestStatus.ACCEPTED,
    ).first()
    if not interest:
        raise HTTPException(status_code=403, detail="Keine aktive Beteiligung gefunden")

    # Check no pending request already exists
    existing = db.query(AdminRequest).filter(
        AdminRequest.requester_id == current_user.id,
        AdminRequest.project_id == project_id,
        AdminRequest.type == RequestType.CHANGE_PARTICIPATION,
        AdminRequest.status == RequestStatus.PENDING,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Eine Änderungsanfrage ist bereits ausstehend")

    if data.amount and data.amount < Decimal("100"):
        raise HTTPException(status_code=400, detail="Mindestbetrag ist 100 €")

    payload = {}
    if data.amount is not None:
        payload["amount"] = float(data.amount)
        payload["old_amount"] = float(interest.amount) if interest.amount else 0
    if data.message is not None:
        payload["message"] = data.message

    req = AdminRequest(
        type=RequestType.CHANGE_PARTICIPATION,
        requester_id=current_user.id,
        project_id=project_id,
        interest_id=interest.id,
        payload=json.dumps(payload),
    )
    db.add(req)
    create_notification(db, NotificationType.CHANGE_REQUESTED, actor=current_user, project=project)
    db.commit()
    return {"message": "Änderung wurde als Anfrage gesendet"}


@router.delete("/{project_id}/participation")
def withdraw_participation(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    interest = db.query(ProjectInterest).filter(
        ProjectInterest.project_id == project_id,
        ProjectInterest.user_id == current_user.id,
        ProjectInterest.interest_type == InterestType.INVESTMENT,
        ProjectInterest.status == InterestStatus.ACCEPTED,
    ).first()
    if not interest:
        raise HTTPException(status_code=403, detail="Keine aktive Beteiligung gefunden")

    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id,
    ).first()

    if project.status == ProjectStatus.ACTIVE:
        # Direct withdrawal
        if member:
            db.delete(member)
        interest.status = InterestStatus.WITHDRAWN
        if interest.amount and project.own_capital:
            project.own_capital = max(Decimal("0"), project.own_capital - interest.amount)
        create_notification(db, NotificationType.PARTICIPATION_WITHDRAWN, actor=current_user, project=project)
        db.commit()
        return {"message": "Teilnahme zurückgezogen", "requires_approval": False}

    elif project.status in LATE_STAGE_STATUSES:
        # Check no pending request already exists
        existing = db.query(AdminRequest).filter(
            AdminRequest.requester_id == current_user.id,
            AdminRequest.project_id == project_id,
            AdminRequest.type == RequestType.WITHDRAW_PARTICIPATION,
            AdminRequest.status == RequestStatus.PENDING,
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Eine Rückzugsanfrage ist bereits ausstehend")

        req = AdminRequest(
            type=RequestType.WITHDRAW_PARTICIPATION,
            requester_id=current_user.id,
            project_id=project_id,
            interest_id=interest.id,
        )
        db.add(req)
        create_notification(db, NotificationType.CHANGE_REQUESTED, actor=current_user, project=project)
        db.commit()
        return {"message": "Anfrage zur Beendigung wurde gesendet", "requires_approval": True}

    else:
        raise HTTPException(status_code=403, detail="Rückzug in diesem Projektstatus nicht möglich")


@router.post("/{project_id}/change-request")
def project_change_request(
    project_id: int,
    data: ProjectChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id,
    ).first()
    if not member or member.project_role not in ("PROJECT_OWNER", "PROJECT_ADMIN"):
        raise HTTPException(status_code=403, detail="Nur Projekt-Ersteller können Änderungsanfragen stellen")

    status_fields = {"status", "cancel", "complete", "pause"}

    if data.changes is not None:
        req_type = RequestType.CHANGE_PROJECT_DATA
        payload = json.dumps({"changes": data.changes})
    else:
        req_type = RequestType.CHANGE_PROJECT_STATUS if data.field in status_fields else RequestType.CHANGE_PROJECT_DATA
        payload = json.dumps({"field": data.field, "value": data.value})
    req = AdminRequest(
        type=req_type,
        requester_id=current_user.id,
        project_id=project_id,
        payload=payload,
    )
    db.add(req)
    create_notification(db, NotificationType.CHANGE_REQUESTED, actor=current_user, project=project)
    db.commit()
    return {"message": "Anfrage wurde an den Admin gesendet"}
