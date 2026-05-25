from decimal import Decimal
from app.core.helpers import calculate_needed_capital, calculate_funding_progress


def test_needed_capital():
    assert calculate_needed_capital(Decimal("5000"), Decimal("1200")) == Decimal("3800")


def test_needed_capital_cannot_be_negative():
    assert calculate_needed_capital(Decimal("1000"), Decimal("2000")) == Decimal("0")


def test_funding_progress():
    result = calculate_funding_progress(Decimal("5000"), Decimal("1200"))
    assert abs(result - 24.0) < 0.01


def test_funding_progress_zero_budget():
    assert calculate_funding_progress(Decimal("0"), Decimal("100")) == 0.0
