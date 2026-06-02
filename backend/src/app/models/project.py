import enum
from decimal import Decimal

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, ForeignKey,
    Integer, Numeric, String, Text, func,
)
from app.core.database import Base


class ProjectStatus(str, enum.Enum):
    IDEA      = "IDEA"
    ACTIVE    = "ACTIVE"
    APPROVED  = "APPROVED"
    CONTRACT  = "CONTRACT"
    FUNDED    = "FUNDED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    PAUSED    = "PAUSED"
    REJECTED  = "REJECTED"


class ProjectVisibility(str, enum.Enum):
    PRIVATE = "PRIVATE"
    PUBLIC = "PUBLIC"
    ONLY_INVESTORS = "ONLY_INVESTORS"
    ARCHIVED = "ARCHIVED"


class VerificationStatus(str, enum.Enum):
    NOT_CHECKED = "NOT_CHECKED"
    IN_REVIEW = "IN_REVIEW"
    DOCUMENTS_MISSING = "DOCUMENTS_MISSING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class RiskLevel(str, enum.Enum):
    UNKNOWN = "UNKNOWN"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ProjectCategory(str, enum.Enum):
    FOOD = "FOOD"
    AGRICULTURE = "AGRICULTURE"
    TRADE = "TRADE"
    HANDMADE = "HANDMADE"
    EDUCATION = "EDUCATION"
    HEALTH = "HEALTH"
    TRANSPORT = "TRANSPORT"
    TECHNOLOGY = "TECHNOLOGY"
    REPAIR_SERVICE = "REPAIR_SERVICE"
    SMALL_SHOP = "SMALL_SHOP"
    RESTAURANT = "RESTAURANT"
    CAFE = "CAFE"
    CLOTHING = "CLOTHING"
    CONSTRUCTION = "CONSTRUCTION"
    SOLAR_ENERGY = "SOLAR_ENERGY"
    WOMEN_BUSINESS = "WOMEN_BUSINESS"
    YOUTH_PROJECT = "YOUTH_PROJECT"
    OTHER = "OTHER"


class ProjectRole(str, enum.Enum):
    PROJECT_OWNER = "PROJECT_OWNER"
    PROJECT_ADMIN = "PROJECT_ADMIN"
    PROJECT_MANAGER = "PROJECT_MANAGER"
    PROJECT_INVESTOR = "PROJECT_INVESTOR"


class InterestType(str, enum.Enum):
    INVESTMENT = "INVESTMENT"
    SUPPORT = "SUPPORT"
    CONTACT = "CONTACT"


class InterestStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class MilestoneStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    DELAYED = "DELAYED"
    CANCELLED = "CANCELLED"


class ProjectUpdateVisibility(str, enum.Enum):
    PRIVATE = "PRIVATE"
    PUBLIC = "PUBLIC"
    INVESTORS_ONLY = "INVESTORS_ONLY"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(150), nullable=False)
    short_description = Column(String(300))
    description = Column(Text, nullable=False)
    category = Column(Enum(ProjectCategory), nullable=False)

    country = Column(String(80), default="Syria")
    city = Column(String(100), nullable=False)
    district = Column(String(100))
    address_text = Column(Text)
    latitude = Column(Numeric(10, 7))
    longitude = Column(Numeric(10, 7))

    total_budget = Column(Numeric(12, 2), nullable=False)
    own_capital = Column(Numeric(12, 2), default=0)
    needed_capital = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="EUR")

    project_goal = Column(Text)
    target_customers = Column(Text)
    business_model = Column(Text)
    expected_monthly_revenue = Column(Numeric(12, 2))
    expected_monthly_profit = Column(Numeric(12, 2))
    start_date = Column(Date)
    expected_duration_months = Column(Integer)

    status = Column(Enum(ProjectStatus), default=ProjectStatus.IDEA, nullable=False)
    visibility = Column(Enum(ProjectVisibility), default=ProjectVisibility.PRIVATE, nullable=False)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.NOT_CHECKED, nullable=False)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.UNKNOWN, nullable=False)

    main_image_url = Column(Text)
    video_url = Column(Text)
    admin_note = Column(Text)
    rejection_reason = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_role = Column(Enum(ProjectRole), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ProjectInterest(Base):
    __tablename__ = "project_interests"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    interest_type = Column(Enum(InterestType), nullable=False)
    message = Column(Text)
    status = Column(Enum(InterestStatus), default=InterestStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ProjectBudgetItem(Base):
    __tablename__ = "project_budget_items"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="EUR")
    is_required = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ProjectMilestone(Base):
    __tablename__ = "project_milestones"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text)
    target_date = Column(Date)
    status = Column(Enum(MilestoneStatus), default=MilestoneStatus.PLANNED, nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ProjectUpdate(Base):
    __tablename__ = "project_updates"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(150), nullable=False)
    content = Column(Text, nullable=False)
    visibility = Column(Enum(ProjectUpdateVisibility), default=ProjectUpdateVisibility.PUBLIC, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
