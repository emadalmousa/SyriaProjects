import enum
import json
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Text

from app.core.database import Base


class RequestType(str, enum.Enum):
    CHANGE_PARTICIPATION   = "CHANGE_PARTICIPATION"
    WITHDRAW_PARTICIPATION = "WITHDRAW_PARTICIPATION"
    CHANGE_PROJECT_DATA    = "CHANGE_PROJECT_DATA"
    CHANGE_PROJECT_STATUS  = "CHANGE_PROJECT_STATUS"


class RequestStatus(str, enum.Enum):
    PENDING  = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class AdminRequest(Base):
    __tablename__ = "admin_requests"

    id           = Column(Integer, primary_key=True, index=True)
    type         = Column(Enum(RequestType), nullable=False)
    status       = Column(Enum(RequestStatus), default=RequestStatus.PENDING, nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id   = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    interest_id  = Column(Integer, ForeignKey("project_interests.id", ondelete="SET NULL"), nullable=True)
    payload      = Column(Text, nullable=True)
    admin_note   = Column(Text, nullable=True)
    created_at   = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at   = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                          onupdate=lambda: datetime.now(timezone.utc), nullable=False)
