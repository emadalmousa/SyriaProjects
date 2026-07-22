from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.core.permissions import ProjectRole, require_project_roles
from app.models.project import ProjectChatMessage
from app.models.user import User
from app.routers.users import get_current_user
from app.schemas.project import (
    ChatMessageCreate,
    ChatMessagePage,
    ChatMessageRead,
    ChatSenderInfo,
)

router = APIRouter(prefix="/projects", tags=["chat"])

ALL_MEMBER_ROLES = [
    ProjectRole.PROJECT_OWNER,
    ProjectRole.PROJECT_ADMIN,
    ProjectRole.PROJECT_MANAGER,
    ProjectRole.PROJECT_INVESTOR,
]

PAGE_SIZE = 30


def _build_read(msg: ProjectChatMessage, user: User | None) -> ChatMessageRead:
    sender = None
    if user is not None:
        sender = ChatSenderInfo(
            id=user.id,
            full_name=user.full_name,
            avatar_url=getattr(user, "avatar_url", None),
        )
    return ChatMessageRead(
        id=msg.id,
        project_id=msg.project_id,
        sender_user_id=msg.sender_user_id,
        sender=sender,
        content=msg.content,
        created_at=msg.created_at,
    )


@router.get("/{project_id}/chat", response_model=ChatMessagePage)
def list_chat_messages(
    project_id: int,
    before_id: int | None = Query(default=None),
    limit: int = Query(default=PAGE_SIZE, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(current_user, db, project_id, ALL_MEMBER_ROLES)

    q = db.query(ProjectChatMessage).filter(
        ProjectChatMessage.project_id == project_id
    )
    if before_id is not None:
        q = q.filter(ProjectChatMessage.id < before_id)
    rows = q.order_by(ProjectChatMessage.id.desc()).limit(limit + 1).all()

    has_more = len(rows) == limit + 1
    if has_more:
        rows = rows[:limit]

    rows.reverse()  # oldest → newest

    sender_ids = {r.sender_user_id for r in rows if r.sender_user_id is not None}
    users_by_id: dict[int, User] = {}
    if sender_ids:
        users_by_id = {
            u.id: u
            for u in db.query(User).filter(User.id.in_(sender_ids)).all()
        }

    messages = [_build_read(r, users_by_id.get(r.sender_user_id)) for r in rows]
    next_cursor = rows[0].id if has_more and rows else None

    return ChatMessagePage(messages=messages, next_cursor=next_cursor, has_more=has_more)


@router.post("/{project_id}/chat", response_model=ChatMessageRead, status_code=201)
def send_chat_message(
    project_id: int,
    data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_roles(current_user, db, project_id, ALL_MEMBER_ROLES)

    msg = ProjectChatMessage(
        project_id=project_id,
        sender_user_id=current_user.id,
        content=data.content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return _build_read(msg, current_user)
