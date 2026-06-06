from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.helpers import calculate_funding_progress
from app.core.notifications import create_notification
from app.core.permissions import is_admin, require_project_roles
from app.models.notification import NotificationType
from app.models.project import (
    InterestStatus, InterestType, Project, ProjectBudgetItem, ProjectInterest,
    ProjectMember, ProjectMilestone, ProjectRole, ProjectStatus,
    ProjectUpdate as ProjectUpdateModel, ProjectVisibility,
)
from app.models.user import User
from app.routers.users import get_current_user
from app.schemas.project import (
    InterestStatusUpdate, ProjectBudgetItemCreate, ProjectBudgetItemRead,
    ProjectBudgetItemUpdate, ProjectCreate, ProjectInterestCreate,
    ParticipantResponse, ProjectInterestResponse, ProjectListItem, ProjectMemberAdd,
    ProjectMemberResponse, ProjectMilestoneCreate, ProjectMilestoneRead,
    ProjectMilestoneUpdate, ProjectRead, ProjectReadAdmin, ProjectStatusUpdate,
    ProjectUpdate as ProjectUpdateSchema, ProjectUpdateCreate, ProjectUpdateRead,
    ProjectUpdateUpdate, ProjectVisibilityUpdate,
)

router = APIRouter(prefix="/projects", tags=["projects"])

ADMIN_ONLY_STATUSES = {ProjectStatus.IDEA}
JOIN_ALLOWED_STATUSES = {ProjectStatus.ACTIVE}


def enrich_project_item(p: Project, db) -> dict:
    item = {
        "id": p.id, "title": p.title, "short_description": p.short_description,
        "category": p.category, "city": p.city, "country": p.country,
        "needed_capital": p.needed_capital or 0, "currency": p.currency,
        "status": p.status, "visibility": p.visibility,
        "main_image_url": p.main_image_url,
        "funding_progress": calculate_funding_progress(
            p.total_budget or Decimal("0"), p.own_capital or Decimal("0")
        ),
    }
    accepted = db.query(ProjectInterest).filter(
        ProjectInterest.project_id == p.id,
        ProjectInterest.status == InterestStatus.ACCEPTED,
    ).all()
    item["participant_count"] = len(accepted)
    item["total_invested"] = float(sum(i.amount or 0 for i in accepted))
    return item
READ_ONLY_STATUSES = {
    ProjectStatus.APPROVED, ProjectStatus.CONTRACT, ProjectStatus.FUNDED,
    ProjectStatus.COMPLETED, ProjectStatus.CANCELLED,
    ProjectStatus.PAUSED, ProjectStatus.REJECTED,
}
PUBLIC_STATUSES = JOIN_ALLOWED_STATUSES | READ_ONLY_STATUSES


@router.get("/public", response_model=list[ProjectListItem])
def list_public_projects(db: Session = Depends(get_db)):
    projects = (
        db.query(Project)
        .filter(
            Project.visibility == ProjectVisibility.PUBLIC,
            Project.status.in_(PUBLIC_STATUSES),
        )
        .all()
    )
    return [enrich_project_item(p, db) for p in projects]


@router.get("/", response_model=list[ProjectListItem])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if is_admin(current_user):
        projects = db.query(Project).all()
    else:
        projects = (
            db.query(Project)
            .filter(
                Project.visibility == ProjectVisibility.PUBLIC,
                Project.status.in_(PUBLIC_STATUSES),
            )
            .all()
        )
    return [enrich_project_item(p, db) for p in projects]


@router.get("/my", response_model=list[ProjectListItem])
def my_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    projects = db.query(Project).filter(Project.created_by_user_id == current_user.id).all()
    return [enrich_project_item(p, db) for p in projects]


@router.get("/my-participations", response_model=list[ProjectListItem])
def my_participations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    memberships = db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()
    project_ids = [m.project_id for m in memberships]
    projects = db.query(Project).filter(
        Project.id.in_(project_ids),
        Project.created_by_user_id != current_user.id,
    ).all()
    return [enrich_project_item(p, db) for p in projects]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project_data = data.model_dump()
    project = Project(**project_data, created_by_user_id=current_user.id)
    db.add(project)
    db.flush()
    member = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        project_role=ProjectRole.PROJECT_OWNER,
    )
    db.add(member)
    db.commit()
    db.refresh(project)
    create_notification(db, NotificationType.PROJECT_CREATED, actor=current_user, project=project)
    db.commit()
    result = ProjectRead.model_validate(project).model_dump()
    result["funding_progress"] = calculate_funding_progress(
        project.total_budget or Decimal("0"), project.own_capital or Decimal("0")
    )
    return result


@router.get("/{project_id}")
def get_project(
    project_id: int,
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
    is_member = member is not None or project.created_by_user_id == current_user.id
    is_owner = project.created_by_user_id == current_user.id
    # Admin-only statuses: only admins and the owner can see
    if project.status in ADMIN_ONLY_STATUSES and not is_admin(current_user) and not is_owner:
        raise HTTPException(status_code=403, detail="Kein Zugriff")
    # For public statuses, non-members need public visibility
    if not is_admin(current_user) and not is_member and not is_owner:
        if project.status not in PUBLIC_STATUSES:
            raise HTTPException(status_code=403, detail="Kein Zugriff")
    fp = calculate_funding_progress(
        project.total_budget or Decimal("0"), project.own_capital or Decimal("0")
    )
    if is_admin(current_user):
        result = ProjectReadAdmin.model_validate(project).model_dump()
    else:
        result = ProjectRead.model_validate(project).model_dump()
    result["funding_progress"] = fp
    return result


@router.patch("/{project_id}")
def update_project(
    project_id: int,
    data: ProjectUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    require_project_roles(current_user, db, project_id, [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN])
    if not is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Direkte Änderungen sind nicht erlaubt. Nutze /projects/{id}/change-request",
        )
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    result = ProjectRead.model_validate(project).model_dump()
    result["funding_progress"] = calculate_funding_progress(
        project.total_budget or Decimal("0"), project.own_capital or Decimal("0")
    )
    return result


@router.patch("/{project_id}/status", response_model=ProjectRead)
def update_status(
    project_id: int,
    data: ProjectStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    require_project_roles(
        current_user, db, project_id,
        [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN, ProjectRole.PROJECT_MANAGER],
    )
    if not is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Direkte Änderungen sind nicht erlaubt. Nutze /projects/{id}/change-request",
        )
    project.status = data.status
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}/visibility", response_model=ProjectRead)
def update_visibility(
    project_id: int,
    data: ProjectVisibilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    require_project_roles(
        current_user, db, project_id,
        [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN, ProjectRole.PROJECT_MANAGER],
    )
    if not is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Direkte Änderungen sind nicht erlaubt. Nutze /projects/{id}/change-request",
        )
    project.visibility = data.visibility
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}/members", response_model=list[ProjectMemberResponse])
def get_members(project_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()


@router.post("/{project_id}/members", response_model=ProjectMemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(
    project_id: int,
    data: ProjectMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(current_user, db, project_id, [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN])
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == data.user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Nutzer ist bereits Mitglied")
    member = ProjectMember(project_id=project_id, **data.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(current_user, db, project_id, [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN])
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")
    db.delete(member)
    db.commit()


class JoinRequest(BaseModel):
    amount: Decimal

    @field_validator("amount")
    @classmethod
    def min_amount(cls, v: Decimal) -> Decimal:
        if v < Decimal("100"):
            raise ValueError("Mindestbetrag ist 100 €")
        return v


@router.post("/{project_id}/join", status_code=status.HTTP_201_CREATED)
def join_project(
    project_id: int,
    data: JoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    if project.status not in JOIN_ALLOWED_STATUSES:
        raise HTTPException(status_code=403, detail="Teilnahme nur bei aktiven Projekten möglich")
    existing = db.query(ProjectInterest).filter(
        ProjectInterest.project_id == project_id,
        ProjectInterest.user_id == current_user.id,
        ProjectInterest.interest_type == InterestType.INVESTMENT,
        ProjectInterest.status.in_([InterestStatus.PENDING, InterestStatus.ACCEPTED]),
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bereits Mitglied oder Anfrage läuft")
    interest = ProjectInterest(
        project_id=project_id,
        user_id=current_user.id,
        interest_type=InterestType.INVESTMENT,
        status=InterestStatus.PENDING,
        amount=data.amount,
    )
    db.add(interest)
    db.flush()
    create_notification(db, NotificationType.JOIN_REQUESTED, actor=current_user, project=project, interest=interest)
    db.commit()
    return {"message": "Anfrage gesendet", "status": "PENDING"}


@router.post("/{project_id}/interests", response_model=ProjectInterestResponse, status_code=status.HTTP_201_CREATED)
def create_interest(
    project_id: int,
    data: ProjectInterestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interest = ProjectInterest(project_id=project_id, user_id=current_user.id, **data.model_dump())
    db.add(interest)
    db.commit()
    db.refresh(interest)
    return interest


@router.get("/{project_id}/interests", response_model=list[ProjectInterestResponse])
def get_interests(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(
        current_user, db, project_id,
        [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN, ProjectRole.PROJECT_MANAGER],
    )
    return db.query(ProjectInterest).filter(ProjectInterest.project_id == project_id).all()


@router.get("/{project_id}/participants", response_model=list[ParticipantResponse])
def get_participants(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    interests = db.query(ProjectInterest).filter(
        ProjectInterest.project_id == project_id,
        ProjectInterest.status.in_([InterestStatus.PENDING, InterestStatus.ACCEPTED]),
    ).all()
    show_private = project.created_by_user_id == current_user.id or is_admin(current_user)
    result = []
    for interest in interests:
        user = db.get(User, interest.user_id)
        if not user:
            continue
        result.append(ParticipantResponse(
            interest_id=interest.id,
            user_id=user.id,
            full_name=user.full_name,
            email=user.email if show_private else None,
            phone=user.phone if show_private else None,
            country=user.country,
            amount=interest.amount,
            status=interest.status.value,
            joined_at=interest.created_at,
        ))
    return result



@router.delete("/{project_id}/participants/{interest_id}", status_code=204)
def remove_participant(
    project_id: int,
    interest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    if project.created_by_user_id != current_user.id and not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    interest = db.get(ProjectInterest, interest_id)
    if not interest or interest.project_id != project_id:
        raise HTTPException(status_code=404, detail="Teilnehmer nicht gefunden")
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == interest.user_id,
    ).first()
    if member:
        db.delete(member)
    db.delete(interest)
    db.commit()


@router.patch("/{project_id}/interests/{interest_id}/status", response_model=ProjectInterestResponse)
def update_interest_status(
    project_id: int,
    interest_id: int,
    data: InterestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(current_user, db, project_id, [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN])
    interest = db.get(ProjectInterest, interest_id)
    if not interest or interest.project_id != project_id:
        raise HTTPException(status_code=404, detail="Interesse nicht gefunden")
    interest.status = data.status
    if data.status == InterestStatus.ACCEPTED and interest.interest_type.value == "INVESTMENT":
        existing = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == interest.user_id,
        ).first()
        if not existing:
            db.add(ProjectMember(
                project_id=project_id,
                user_id=interest.user_id,
                project_role=ProjectRole.PROJECT_INVESTOR,
            ))
    db.commit()
    db.refresh(interest)
    return interest


# Budget Items
@router.get("/{project_id}/budget-items", response_model=list[ProjectBudgetItemRead])
def get_budget_items(project_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(ProjectBudgetItem).filter(
        ProjectBudgetItem.project_id == project_id
    ).order_by(ProjectBudgetItem.sort_order).all()


@router.post("/{project_id}/budget-items", response_model=ProjectBudgetItemRead, status_code=status.HTTP_201_CREATED)
def add_budget_item(
    project_id: int,
    data: ProjectBudgetItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(current_user, db, project_id, [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN])
    item = ProjectBudgetItem(project_id=project_id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{project_id}/budget-items/{item_id}", response_model=ProjectBudgetItemRead)
def update_budget_item(
    project_id: int,
    item_id: int,
    data: ProjectBudgetItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(current_user, db, project_id, [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN])
    item = db.get(ProjectBudgetItem, item_id)
    if not item or item.project_id != project_id:
        raise HTTPException(status_code=404, detail="Budget-Position nicht gefunden")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{project_id}/budget-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget_item(
    project_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(current_user, db, project_id, [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN])
    item = db.get(ProjectBudgetItem, item_id)
    if not item or item.project_id != project_id:
        raise HTTPException(status_code=404, detail="Budget-Position nicht gefunden")
    db.delete(item)
    db.commit()


# Milestones
@router.get("/{project_id}/milestones", response_model=list[ProjectMilestoneRead])
def get_milestones(project_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(ProjectMilestone).filter(
        ProjectMilestone.project_id == project_id
    ).order_by(ProjectMilestone.sort_order).all()


@router.post("/{project_id}/milestones", response_model=ProjectMilestoneRead, status_code=status.HTTP_201_CREATED)
def add_milestone(
    project_id: int,
    data: ProjectMilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(current_user, db, project_id, [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN])
    milestone = ProjectMilestone(project_id=project_id, **data.model_dump())
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.patch("/{project_id}/milestones/{milestone_id}", response_model=ProjectMilestoneRead)
def update_milestone(
    project_id: int,
    milestone_id: int,
    data: ProjectMilestoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(current_user, db, project_id, [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN])
    milestone = db.get(ProjectMilestone, milestone_id)
    if not milestone or milestone.project_id != project_id:
        raise HTTPException(status_code=404, detail="Meilenstein nicht gefunden")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(milestone, field, value)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.delete("/{project_id}/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_milestone(
    project_id: int,
    milestone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(current_user, db, project_id, [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN])
    milestone = db.get(ProjectMilestone, milestone_id)
    if not milestone or milestone.project_id != project_id:
        raise HTTPException(status_code=404, detail="Meilenstein nicht gefunden")
    db.delete(milestone)
    db.commit()


# Project Updates
@router.get("/{project_id}/updates", response_model=list[ProjectUpdateRead])
def get_updates(project_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(ProjectUpdateModel).filter(ProjectUpdateModel.project_id == project_id).all()


@router.post("/{project_id}/updates", response_model=ProjectUpdateRead, status_code=status.HTTP_201_CREATED)
def add_update(
    project_id: int,
    data: ProjectUpdateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(
        current_user, db, project_id,
        [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN, ProjectRole.PROJECT_MANAGER],
    )
    update = ProjectUpdateModel(project_id=project_id, created_by_user_id=current_user.id, **data.model_dump())
    db.add(update)
    db.commit()
    db.refresh(update)
    return update


@router.patch("/{project_id}/updates/{update_id}", response_model=ProjectUpdateRead)
def update_project_update(
    project_id: int,
    update_id: int,
    data: ProjectUpdateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(
        current_user, db, project_id,
        [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN, ProjectRole.PROJECT_MANAGER],
    )
    upd = db.get(ProjectUpdateModel, update_id)
    if not upd or upd.project_id != project_id:
        raise HTTPException(status_code=404, detail="Update nicht gefunden")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(upd, field, value)
    db.commit()
    db.refresh(upd)
    return upd


@router.delete("/{project_id}/updates/{update_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_update(
    project_id: int,
    update_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(
        current_user, db, project_id,
        [ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN, ProjectRole.PROJECT_MANAGER],
    )
    upd = db.get(ProjectUpdateModel, update_id)
    if not upd or upd.project_id != project_id:
        raise HTTPException(status_code=404, detail="Update nicht gefunden")
    db.delete(upd)
    db.commit()
