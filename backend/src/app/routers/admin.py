from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import is_admin
from app.models.project import Project, ProjectMember, ProjectInterest, ProjectBudgetItem, ProjectMilestone, ProjectUpdate
from app.models.user import User
from app.routers.users import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    return current_user


@router.get("/test-data/status")
def test_data_status(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user_count = db.query(User).filter(User.is_test_data == True).count()  # noqa: E712
    project_count = db.query(Project).filter(Project.is_test_data == True).count()  # noqa: E712
    return {"exists": user_count > 0 or project_count > 0, "users": user_count, "projects": project_count}


@router.post("/test-data/seed")
def seed_test_data(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    existing = db.query(User).filter(User.is_test_data == True).first()  # noqa: E712
    if existing:
        raise HTTPException(status_code=400, detail="Test data already exists")
    from app.seed_demo import seed
    seed()
    user_count = db.query(User).filter(User.is_test_data == True).count()  # noqa: E712
    project_count = db.query(Project).filter(Project.is_test_data == True).count()  # noqa: E712
    return {"status": "seeded", "users": user_count, "projects": project_count}


@router.delete("/test-data")
def delete_test_data(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    test_user_ids = [r[0] for r in db.query(User.id).filter(User.is_test_data == True).all()]  # noqa: E712
    test_project_ids = [r[0] for r in db.query(Project.id).filter(Project.is_test_data == True).all()]  # noqa: E712

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
