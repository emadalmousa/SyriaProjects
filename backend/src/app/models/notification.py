import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String

from app.core.database import Base


class NotificationType(str, enum.Enum):
    USER_REGISTERED        = "USER_REGISTERED"
    PROJECT_CREATED        = "PROJECT_CREATED"
    PROJECT_STATUS_CHANGED = "PROJECT_STATUS_CHANGED"
    JOIN_REQUESTED         = "JOIN_REQUESTED"
    JOIN_ACCEPTED          = "JOIN_ACCEPTED"
    JOIN_REJECTED          = "JOIN_REJECTED"
    PROJECT_APPROVED       = "PROJECT_APPROVED"
    PROJECT_REJECTED       = "PROJECT_REJECTED"
    PARTICIPATION_WITHDRAWN = "PARTICIPATION_WITHDRAWN"
    CHANGE_REQUESTED        = "CHANGE_REQUESTED"
    REQUEST_ACCEPTED        = "REQUEST_ACCEPTED"
    REQUEST_REJECTED        = "REQUEST_REJECTED"
    DOCUMENT_UPLOADED       = "DOCUMENT_UPLOADED"


class SystemNotification(Base):
    __tablename__ = "system_notifications"

    id          = Column(Integer, primary_key=True, index=True)
    type        = Column(Enum(NotificationType), nullable=False)
    message     = Column(String(500), nullable=False)
    actor_id    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    project_id  = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    interest_id = Column(Integer, ForeignKey("project_interests.id", ondelete="CASCADE"), nullable=True)
    is_read     = Column(Boolean, default=False, nullable=False)
    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
