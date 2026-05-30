from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import is_admin
from app.models.project import Project, ProjectMember, ProjectInterest, ProjectBudgetItem, ProjectMilestone, ProjectUpdate
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
