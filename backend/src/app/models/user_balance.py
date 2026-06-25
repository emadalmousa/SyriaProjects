from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, UniqueConstraint
from app.core.database import Base


class UserBalance(Base):
    __tablename__ = "user_balances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    currency = Column(String(10), nullable=False)
    amount = Column(Numeric(14, 2), default=0, nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "currency", name="uq_user_currency"),)
