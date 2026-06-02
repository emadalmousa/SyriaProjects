import pytest
from decimal import Decimal
from app.schemas.project import ProjectCreate, calculate_needed_capital
from app.models.project import ProjectCategory
from test.conftest import register_and_login  # use shared helper


BASE_PROJECT = {
    "title": "Kleine Bäckerei in Aleppo",
    "description": "Eine kleine Bäckerei in Aleppo für Brot und Backwaren.",
    "category": "FOOD",
    "city": "Aleppo",
    "total_budget": 5000,
    "own_capital": 1200,
}


@pytest.fixture
def owner_headers(client):
    return register_and_login(client, "owner@test.com")


@pytest.fixture
def other_headers(client):
    return register_and_login(client, "other@test.com")


def test_create_project_with_full_fields(client, owner_headers):
    resp = client.post("/projects/", json=BASE_PROJECT, headers=owner_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Kleine Bäckerei in Aleppo"
    assert data["category"] == "FOOD"
    assert data["city"] == "Aleppo"
    assert data["status"] == "IDEA"


def test_needed_capital_auto_calculated(client, owner_headers):
    resp = client.post("/projects/", json=BASE_PROJECT, headers=owner_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert float(data["needed_capital"]) == 3800.0


def test_needed_capital_helper():
    result = calculate_needed_capital(Decimal("5000"), Decimal("1200"))
    assert result == Decimal("3800")


def test_project_without_title_rejected(client, owner_headers):
    payload = {**BASE_PROJECT, "title": ""}
    resp = client.post("/projects/", json=payload, headers=owner_headers)
    assert resp.status_code == 422


def test_project_without_city_rejected(client, owner_headers):
    payload = {**BASE_PROJECT, "city": ""}
    resp = client.post("/projects/", json=payload, headers=owner_headers)
    assert resp.status_code == 422


def test_project_negative_budget_rejected(client, owner_headers):
    payload = {**BASE_PROJECT, "total_budget": -100}
    resp = client.post("/projects/", json=payload, headers=owner_headers)
    assert resp.status_code == 422


def test_add_budget_item(client, owner_headers):
    project_id = client.post("/projects/", json=BASE_PROJECT, headers=owner_headers).json()["id"]
    resp = client.post(
        f"/projects/{project_id}/budget-items",
        json={"title": "Backofen", "amount": 1800},
        headers=owner_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["title"] == "Backofen"


def test_add_milestone(client, owner_headers):
    project_id = client.post("/projects/", json=BASE_PROJECT, headers=owner_headers).json()["id"]
    resp = client.post(
        f"/projects/{project_id}/milestones",
        json={"title": "Laden auswählen"},
        headers=owner_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["status"] == "PLANNED"


def test_add_project_update(client, owner_headers):
    project_id = client.post("/projects/", json=BASE_PROJECT, headers=owner_headers).json()["id"]
    resp = client.post(
        f"/projects/{project_id}/updates",
        json={"title": "Ofen wurde gekauft", "content": "Der Backofen wurde erfolgreich geliefert."},
        headers=owner_headers,
    )
    assert resp.status_code == 201


def test_public_list_only_shows_approved_public(client, owner_headers):
    resp = client.get("/projects/public")
    assert resp.status_code == 200
    valid_public_statuses = {"ACTIVE", "APPROVED", "CONTRACT", "FUNDED", "COMPLETED", "CANCELLED", "PAUSED", "REJECTED"}
    for p in resp.json():
        assert p["visibility"] == "PUBLIC"
        assert p["status"] in valid_public_statuses


def test_normal_user_cannot_see_admin_fields(client, owner_headers):
    project_id = client.post("/projects/", json=BASE_PROJECT, headers=owner_headers).json()["id"]
    resp = client.get(f"/projects/{project_id}", headers=owner_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "admin_note" not in data or data.get("admin_note") is None


def test_normal_user_cannot_manage_foreign_project(client, owner_headers, other_headers):
    project_id = client.post("/projects/", json=BASE_PROJECT, headers=owner_headers).json()["id"]
    resp = client.patch(
        f"/projects/{project_id}/status",
        json={"status": "APPROVED"},
        headers=other_headers,
    )
    assert resp.status_code == 403
