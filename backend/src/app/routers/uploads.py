import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile

from app.models.user import User
from app.routers.users import get_current_user

router = APIRouter(prefix="/uploads", tags=["uploads"])
UPLOAD_DIR = Path("uploads")


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    UPLOAD_DIR.mkdir(exist_ok=True)
    ext = Path(file.filename).suffix if file.filename else ""
    filename = f"{uuid.uuid4()}{ext}"
    dest = UPLOAD_DIR / filename
    content = await file.read()
    dest.write_bytes(content)
    return {"filename": filename, "original": file.filename, "size": len(content)}
