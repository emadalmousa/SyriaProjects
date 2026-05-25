from test.conftest import register_and_login
from app.models.user import GlobalRole, User


def test_admin_can_list_users(client, db):
    admin_headers = register_and_login(client, "admin@test.com")
    me = client.get("/users/me", headers=admin_headers).json()
    user = db.get(User, me["id"])
    user.global_role = GlobalRole.ADMIN
    db.commit()

    resp = client.get("/users/", headers=admin_headers)
    assert resp.status_code == 200


def test_non_admin_cannot_list_users(client):
    headers = register_and_login(client, "normal@test.com")
    resp = client.get("/users/", headers=headers)
    assert resp.status_code == 403
