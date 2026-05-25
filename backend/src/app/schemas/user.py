from datetime import datetime
from pydantic import BaseModel, EmailStr, field_serializer
from app.models.user import GlobalRole, UserType


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    country: str | None = None
    user_type: UserType = UserType.OTHER


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str | None
    last_name: str | None
    full_name: str | None
    phone: str | None
    country: str | None
    user_type: UserType
    avatar_url: str | None
    global_role: GlobalRole
    is_active: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}

    @field_serializer("created_at")
    def serialize_created_at(self, v: datetime | None) -> str | None:
        return v.isoformat() if v else None


class UserRoleUpdate(BaseModel):
    global_role: GlobalRole


class UserProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    country: str | None = None


class GoogleAuthRequest(BaseModel):
    id_token: str
