import json
import uuid
from decimal import Decimal
import cloudinary.uploader
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import is_admin, is_superadmin
from app.core.security import decode_access_token
from app.models.admin_request import AdminRequest, RequestType, RequestStatus
from app.models.project import Project, ProjectInterest, InterestType
from app.models.user import GlobalRole, User, UserDocument
from app.models.user_balance import UserBalance
from app.schemas.user import UserDocumentRead, UserProfileUpdate, UserResponse, UserRoleUpdate

MAX_PDF_SIZE = 10 * 1024 * 1024

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


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    balances = db.query(UserBalance).filter(UserBalance.user_id == current_user.id).all()
    data = UserResponse.model_validate(current_user).model_dump()
    data["investment_balances"] = [{"currency": b.currency, "amount": float(b.amount)} for b in balances]
    return data


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
    if not is_superadmin(current_user):
        raise HTTPException(status_code=403, detail="Only superadmin can change roles")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    if data.global_role == GlobalRole.SUPERADMIN:
        raise HTTPException(status_code=400, detail="SUPERADMIN role cannot be assigned")
    if user.global_role == GlobalRole.SUPERADMIN:
        raise HTTPException(status_code=400, detail="Cannot change SUPERADMIN role")
    user.global_role = data.global_role
    db.commit()
    db.refresh(user)
    return user


@router.get("/", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only admins can list users")
    return db.query(User).filter(User.global_role != GlobalRole.SUPERADMIN).limit(500).all()


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


@router.get("/me/requests")
def get_my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    requests = (
        db.query(AdminRequest)
        .filter(AdminRequest.requester_id == current_user.id)
        .order_by(AdminRequest.created_at.desc())
        .all()
    )
    result = []
    for r in requests:
        project = db.get(Project, r.project_id) if r.project_id else None
        result.append({
            "id": r.id,
            "type": r.type,
            "status": r.status,
            "project_id": r.project_id,
            "project_title": project.title if project else None,
            "payload": r.payload,
            "admin_note": r.admin_note,
            "created_at": r.created_at.isoformat(),
        })
    return result


@router.post("/me/balance-request")
async def request_balance_change(
    amount: float = Form(...),
    currency: str = Form(...),
    note: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Betrag darf nicht negativ sein")
    if currency not in ("EUR", "USD", "SYP"):
        raise HTTPException(status_code=400, detail="Ungültige Währung")

    content = await file.read()
    if len(content) > MAX_PDF_SIZE:
        raise HTTPException(status_code=413, detail="Datei zu groß. Maximale Größe: 10 MB")
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=415, detail="Nur PDF-Dateien sind erlaubt")

    pending = (
        db.query(AdminRequest)
        .filter(
            AdminRequest.requester_id == current_user.id,
            AdminRequest.type == RequestType.CHANGE_BALANCE,
            AdminRequest.status == RequestStatus.PENDING,
        )
        .first()
    )
    if pending:
        pending_payload = json.loads(pending.payload) if pending.payload else {}
        if pending_payload.get("currency") == currency:
            raise HTTPException(status_code=400, detail="Es gibt bereits eine ausstehende Anfrage für diese Währung")

    result = cloudinary.uploader.upload(
        content,
        resource_type="raw",
        folder="syria-projects/balance-docs",
        public_id=str(uuid.uuid4()),
        use_filename=False,
        unique_filename=True,
    )
    document_url = result["secure_url"]

    payload_data: dict = {"amount": amount, "currency": currency, "document_url": document_url}
    if note:
        payload_data["note"] = note
    req = AdminRequest(
        type=RequestType.CHANGE_BALANCE,
        requester_id=current_user.id,
        payload=json.dumps(payload_data),
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"message": "Anfrage eingereicht", "request_id": req.id}


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
    if user.global_role == GlobalRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Cannot block superadmin")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user


@router.post("/me/documents", response_model=UserDocumentRead, status_code=201)
async def upload_user_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    if len(content) > MAX_PDF_SIZE:
        raise HTTPException(status_code=413, detail="Datei zu groß. Maximale Größe: 10 MB")
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=415, detail="Nur PDF-Dateien sind erlaubt")
    if file.content_type and file.content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=415, detail="Nur PDF-Dateien sind erlaubt")

    result = cloudinary.uploader.upload(
        content,
        resource_type="raw",
        folder="syria-projects/user-docs",
        public_id=str(uuid.uuid4()),
        use_filename=False,
        unique_filename=True,
    )
    doc = UserDocument(
        user_id=current_user.id,
        file_url=result["secure_url"],
        original_name=file.filename or "document.pdf",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/me/documents", response_model=list[UserDocumentRead])
def list_user_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(UserDocument)
        .filter(UserDocument.user_id == current_user.id)
        .order_by(UserDocument.created_at.desc())
        .all()
    )


@router.delete("/me/documents/{doc_id}", status_code=204)
def delete_user_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.get(UserDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    if doc.user_id != current_user.id and not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    db.delete(doc)
    db.commit()
