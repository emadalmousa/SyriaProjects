from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.project import (
    InterestStatus, InterestType, MilestoneStatus, ProjectCategory,
    ProjectRole, ProjectStatus, ProjectUpdateVisibility, ProjectVisibility,
    RiskLevel, VerificationStatus,
)


def calculate_needed_capital(total_budget: Decimal, own_capital: Decimal) -> Decimal:
    result = total_budget - own_capital
    return max(result, Decimal("0"))


def calculate_funding_progress(total_budget: Decimal, own_capital: Decimal) -> float:
    if total_budget <= 0:
        return 0.0
    return float(own_capital / total_budget * 100)


class ProjectCreate(BaseModel):
    title: str
    description: str
    category: ProjectCategory
    city: str
    total_budget: Decimal
    own_capital: Decimal = Decimal("0")
    needed_capital: Decimal | None = None
    currency: str = "EUR"
    country: str = "Syria"
    short_description: str | None = None
    district: str | None = None
    address_text: str | None = None
    project_goal: str | None = None
    target_customers: str | None = None
    business_model: str | None = None
    expected_monthly_revenue: Decimal | None = None
    expected_monthly_profit: Decimal | None = None
    expected_duration_months: int | None = None
    start_date: date | None = None
    visibility: ProjectVisibility = ProjectVisibility.PUBLIC

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Titel darf nicht leer sein")
        return v.strip()

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Beschreibung darf nicht leer sein")
        return v.strip()

    @field_validator("city")
    @classmethod
    def city_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Stadt darf nicht leer sein")
        return v.strip()

    @field_validator("total_budget")
    @classmethod
    def total_budget_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Gesamtbudget muss größer als 0 sein")
        return v

    @field_validator("own_capital")
    @classmethod
    def own_capital_not_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Eigenkapital darf nicht negativ sein")
        return v

    @field_validator("expected_monthly_revenue")
    @classmethod
    def revenue_not_negative(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v < 0:
            raise ValueError("Erwarteter Umsatz darf nicht negativ sein")
        return v

    @field_validator("expected_duration_months")
    @classmethod
    def duration_positive(cls, v: int | None) -> int | None:
        if v is not None and v <= 0:
            raise ValueError("Laufzeit muss größer als 0 sein")
        return v

    def model_post_init(self, __context) -> None:
        if self.needed_capital is None:
            object.__setattr__(
                self, "needed_capital",
                calculate_needed_capital(self.total_budget, self.own_capital)
            )


class ProjectUpdate(BaseModel):
    title: str | None = None
    short_description: str | None = None
    description: str | None = None
    category: ProjectCategory | None = None
    country: str | None = None
    city: str | None = None
    district: str | None = None
    address_text: str | None = None
    total_budget: Decimal | None = None
    own_capital: Decimal | None = None
    needed_capital: Decimal | None = None
    currency: str | None = None
    project_goal: str | None = None
    target_customers: str | None = None
    business_model: str | None = None
    expected_monthly_revenue: Decimal | None = None
    expected_monthly_profit: Decimal | None = None
    expected_duration_months: int | None = None
    start_date: date | None = None
    main_image_url: str | None = None
    video_url: str | None = None


class ProjectRead(BaseModel):
    id: int
    created_by_user_id: int
    title: str
    short_description: str | None
    description: str
    category: ProjectCategory
    country: str | None
    city: str
    district: str | None
    address_text: str | None
    total_budget: Decimal
    own_capital: Decimal
    needed_capital: Decimal
    currency: str
    project_goal: str | None
    target_customers: str | None
    business_model: str | None
    expected_monthly_revenue: Decimal | None
    expected_monthly_profit: Decimal | None
    expected_duration_months: int | None
    start_date: date | None
    status: ProjectStatus
    visibility: ProjectVisibility
    verification_status: VerificationStatus
    risk_level: RiskLevel
    main_image_url: str | None
    video_url: str | None
    funding_progress: float = 0.0
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ParticipantResponse(BaseModel):
    interest_id: int
    user_id: int
    full_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    country: Optional[str]
    amount: Optional[Decimal]
    status: str
    joined_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ProjectReadAdmin(ProjectRead):
    admin_note: str | None
    rejection_reason: str | None


class ProjectListItem(BaseModel):
    id: int
    title: str
    short_description: str | None
    category: ProjectCategory
    city: str
    country: str | None
    needed_capital: Decimal
    currency: str
    status: ProjectStatus
    visibility: ProjectVisibility
    main_image_url: str | None
    funding_progress: float = 0.0
    participant_count: int = 0
    total_invested: float = 0.0

    model_config = {"from_attributes": True}


class ProjectStatusUpdate(BaseModel):
    status: ProjectStatus


class ProjectVisibilityUpdate(BaseModel):
    visibility: ProjectVisibility


class ProjectMemberAdd(BaseModel):
    user_id: int
    project_role: ProjectRole


class ProjectMemberResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    project_role: ProjectRole

    model_config = {"from_attributes": True}


class ProjectInterestCreate(BaseModel):
    interest_type: InterestType
    message: str | None = None
    amount: Optional[Decimal] = None


class ProjectInterestResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    interest_type: InterestType
    message: str | None
    amount: Optional[Decimal] = None
    status: InterestStatus

    model_config = {"from_attributes": True}


class UserInterestResponse(BaseModel):
    id: int
    project_id: int
    project_title: str
    project_status: Optional[str] = None
    amount: Optional[Decimal] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationResponse(BaseModel):
    id: int
    type: str
    message: str
    actor_name: Optional[str] = None
    project_id: Optional[int] = None
    project_title: Optional[str] = None
    interest_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterestStatusUpdate(BaseModel):
    status: InterestStatus


class ProjectBudgetItemCreate(BaseModel):
    title: str
    description: str | None = None
    amount: Decimal
    currency: str = "EUR"
    is_required: bool = True
    sort_order: int = 0


class ProjectBudgetItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    amount: Decimal | None = None
    currency: str | None = None
    is_required: bool | None = None
    sort_order: int | None = None


class ProjectBudgetItemRead(BaseModel):
    id: int
    project_id: int
    title: str
    description: str | None
    amount: Decimal
    currency: str
    is_required: bool
    sort_order: int

    model_config = {"from_attributes": True}


class ProjectMilestoneCreate(BaseModel):
    title: str
    description: str | None = None
    target_date: date | None = None
    sort_order: int = 0


class ProjectMilestoneUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    target_date: date | None = None
    status: MilestoneStatus | None = None
    sort_order: int | None = None


class ProjectMilestoneRead(BaseModel):
    id: int
    project_id: int
    title: str
    description: str | None
    target_date: date | None
    status: MilestoneStatus
    sort_order: int

    model_config = {"from_attributes": True}


class ProjectUpdateCreate(BaseModel):
    title: str
    content: str
    visibility: ProjectUpdateVisibility = ProjectUpdateVisibility.PUBLIC


class ProjectUpdateUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    visibility: ProjectUpdateVisibility | None = None


class ProjectUpdateRead(BaseModel):
    id: int
    project_id: int
    created_by_user_id: int
    title: str
    content: str
    visibility: ProjectUpdateVisibility

    model_config = {"from_attributes": True}


class ProjectPhaseItemCreate(BaseModel):
    milestone_id: int
    title: str
    amount: Decimal
    sort_order: int = 0


class ProjectPhaseItemUpdate(BaseModel):
    title: str | None = None
    amount: Decimal | None = None
    sort_order: int | None = None


class ProjectPhaseItemRead(BaseModel):
    id: int
    project_id: int
    milestone_id: int
    title: str
    amount: Decimal
    sort_order: int

    model_config = {"from_attributes": True}


class ChatMessageCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 2000:
            raise ValueError("Message too long (max 2000 characters)")
        return v


class ChatSenderInfo(BaseModel):
    id: int
    full_name: str | None = None
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class ChatMessageRead(BaseModel):
    id: int
    project_id: int
    sender_user_id: int | None = None
    sender: ChatSenderInfo | None = None
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatMessagePage(BaseModel):
    messages: list[ChatMessageRead]
    next_cursor: int | None = None
    has_more: bool
