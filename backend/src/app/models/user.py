import enum
from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String, func
from app.core.database import Base


class GlobalRole(str, enum.Enum):
    ADMIN = "ADMIN"
    USER = "USER"


class UserType(str, enum.Enum):
    PROJECT_SUBMITTER = "PROJECT_SUBMITTER"
    INVESTOR = "INVESTOR"
    PARTNER = "PARTNER"
    OTHER = "OTHER"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    first_name = Column(String)
    last_name = Column(String)
    phone = Column(String)
    country = Column(String)
    user_type = Column(Enum(UserType), default=UserType.OTHER)
    avatar_url = Column(String)
    oauth_provider = Column(String)
    global_role = Column(Enum(GlobalRole), default=GlobalRole.USER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def full_name(self):
        parts = [self.first_name, self.last_name]
        return " ".join(p for p in parts if p) or None
