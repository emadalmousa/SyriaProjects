from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.project import ProjectBudgetItem


def calculate_needed_capital(total_budget: Decimal, own_capital: Decimal) -> Decimal:
    result = total_budget - own_capital
    return max(result, Decimal("0"))


def calculate_funding_progress(total_budget: Decimal, own_capital: Decimal) -> float:
    if not total_budget or total_budget <= 0:
        return 0.0
    return float(own_capital / total_budget * 100)


def calculate_budget_items_sum(db: Session, project_id: int) -> Decimal:
    items = db.query(ProjectBudgetItem).filter(ProjectBudgetItem.project_id == project_id).all()
    return sum((item.amount for item in items), Decimal("0"))


def validate_budget_items_against_project(db: Session, project_id: int, total_budget: Decimal) -> bool:
    items_sum = calculate_budget_items_sum(db, project_id)
    diff = abs(items_sum - total_budget)
    tolerance = total_budget * Decimal("0.05")
    return diff <= tolerance
