import uuid

import cloudinary.uploader
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.notifications import create_notification
from app.core.permissions import is_admin
from app.models.notification import NotificationType
from app.models.project import (
    DocumentType, InterestStatus, InterestType, ProjectDocument,
    ProjectInterest, ProjectMember, ProjectRole, Project,
)
from app.models.user import User
from app.routers.users import get_current_user
from app.schemas.project import ProjectDocumentRead

router = APIRouter(prefix="/projects", tags=["documents"])

MAX_PDF_SIZE = 10 * 1024 * 1024  # 10 MB


def _validate_pdf(content: bytes, content_type: str | None) -> None:
    if len(content) > MAX_PDF_SIZE:
        raise HTTPException(status_code=413, detail="Datei zu groß. Maximale Größe: 10 MB")
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=415, detail="Nur PDF-Dateien sind erlaubt")
    if content_type and content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=415, detail="Nur PDF-Dateien sind erlaubt")


def _upload_to_cloudinary(content: bytes, original_name: str) -> str:
    result = cloudinary.uploader.upload(
        content,
        resource_type="raw",
        folder="syria-projects/documents",
        public_id=str(uuid.uuid4()),
        use_filename=False,
        unique_filename=True,
    )
    return result["secure_url"]


def _enrich(doc: ProjectDocument, db: Session) -> dict:
    data = ProjectDocumentRead.model_validate(doc).model_dump()
    if doc.uploaded_by_user_id:
        uploader = db.get(User, doc.uploaded_by_user_id)
        if uploader:
            data["uploader_name"] = uploader.full_name or uploader.email
    return data


def _can_see_doc(doc: ProjectDocument, current_user: User, project: Project, db: Session) -> bool:
    if is_admin(current_user):
        return True
    if doc.document_type == DocumentType.PROJECT_DOCUMENT:
        return project.created_by_user_id == current_user.id
    # PARTICIPANT_DOCUMENT — only the uploader
    return doc.uploaded_by_user_id == current_user.id


@router.post("/{project_id}/documents", response_model=ProjectDocumentRead, status_code=201)
async def upload_project_document(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    is_project_owner = project.created_by_user_id == current_user.id
    has_owner_role = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id,
        ProjectMember.project_role.in_([ProjectRole.PROJECT_OWNER, ProjectRole.PROJECT_ADMIN]),
    ).first() is not None

    if not is_project_owner and not has_owner_role and not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")

    content = await file.read()
    _validate_pdf(content, file.content_type)

    file_url = _upload_to_cloudinary(content, file.filename or "document.pdf")

    doc = ProjectDocument(
        project_id=project_id,
        document_type=DocumentType.PROJECT_DOCUMENT,
        file_url=file_url,
        original_name=file.filename or "document.pdf",
        uploaded_by_user_id=current_user.id,
    )
    db.add(doc)
    db.flush()
    create_notification(db, NotificationType.DOCUMENT_UPLOADED, actor=current_user, project=project)
    db.commit()
    db.refresh(doc)
    return _enrich(doc, db)


@router.post("/{project_id}/participants/{interest_id}/documents", response_model=ProjectDocumentRead, status_code=201)
async def upload_participant_document(
    project_id: int,
    interest_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    interest = db.get(ProjectInterest, interest_id)
    if not interest or interest.project_id != project_id:
        raise HTTPException(status_code=404, detail="Beteiligung nicht gefunden")

    if interest.user_id != current_user.id and not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")

    if interest.interest_type != InterestType.INVESTMENT or interest.status not in (
        InterestStatus.PENDING, InterestStatus.ACCEPTED
    ):
        raise HTTPException(status_code=403, detail="Nur aktive oder ausstehende Beteiligungen können Dokumente hochladen")

    content = await file.read()
    _validate_pdf(content, file.content_type)

    file_url = _upload_to_cloudinary(content, file.filename or "document.pdf")

    doc = ProjectDocument(
        project_id=project_id,
        interest_id=interest_id,
        document_type=DocumentType.PARTICIPANT_DOCUMENT,
        file_url=file_url,
        original_name=file.filename or "document.pdf",
        uploaded_by_user_id=current_user.id,
    )
    db.add(doc)
    db.flush()
    create_notification(db, NotificationType.DOCUMENT_UPLOADED, actor=current_user, project=project, interest=interest)
    db.commit()
    db.refresh(doc)
    return _enrich(doc, db)


@router.get("/{project_id}/documents", response_model=list[ProjectDocumentRead])
def list_documents(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    if is_admin(current_user):
        docs = (
            db.query(ProjectDocument)
            .filter(ProjectDocument.project_id == project_id)
            .order_by(ProjectDocument.created_at.desc())
            .all()
        )
        return [_enrich(d, db) for d in docs]

    if project.created_by_user_id == current_user.id:
        docs = (
            db.query(ProjectDocument)
            .filter(
                ProjectDocument.project_id == project_id,
                ProjectDocument.document_type == DocumentType.PROJECT_DOCUMENT,
            )
            .order_by(ProjectDocument.created_at.desc())
            .all()
        )
        return [_enrich(d, db) for d in docs]

    # Participant: only their own PARTICIPANT_DOCUMENT rows
    interest = db.query(ProjectInterest).filter(
        ProjectInterest.project_id == project_id,
        ProjectInterest.user_id == current_user.id,
        ProjectInterest.interest_type == InterestType.INVESTMENT,
        ProjectInterest.status.in_([InterestStatus.PENDING, InterestStatus.ACCEPTED]),
    ).first()
    if not interest:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")

    docs = (
        db.query(ProjectDocument)
        .filter(
            ProjectDocument.project_id == project_id,
            ProjectDocument.document_type == DocumentType.PARTICIPANT_DOCUMENT,
            ProjectDocument.uploaded_by_user_id == current_user.id,
        )
        .order_by(ProjectDocument.created_at.desc())
        .all()
    )
    return [_enrich(d, db) for d in docs]
