from test.conftest import register_and_login


def test_admin_can_list_users(client):
    # First registration automatically becomes ADMIN
    admin_headers = register_and_login(client, "admin@test.com")

    resp = client.get("/users/", headers=admin_headers)
    assert resp.status_code == 200


def test_non_admin_cannot_list_users(client):
    # Ensure an admin exists first, then register a regular user
    register_and_login(client, "admin@test.com")
    headers = register_and_login(client, "normal@test.com")

    resp = client.get("/users/", headers=headers)
    assert resp.status_code == 403
