from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.api import accounts as accounts_module
from app.api.deps import get_current_user, get_db
from app.main import app


TEST_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


@pytest.fixture
def authenticated_client():
    previous_overrides = app.dependency_overrides.copy()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=TEST_USER_ID
    )
    app.dependency_overrides[get_db] = lambda: object()

    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


@pytest.fixture
def anonymous_client():
    previous_overrides = app.dependency_overrides.copy()

    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides[get_db] = lambda: object()

    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def test_list_accounts_forwards_filters(authenticated_client, monkeypatch):
    captured = {}

    def fake_list_accounts(db, user_id, **kwargs):
        captured["user_id"] = user_id
        captured.update(kwargs)
        return [], 0

    monkeypatch.setattr(
        accounts_module.account_service,
        "list_accounts",
        fake_list_accounts,
    )

    response = authenticated_client.get(
        "/api/v1/accounts",
        params={
            "status": "active",
            "risk_level": "high",
            "renewal_within_days": 30,
            "has_open_tasks": "true",
            "page": 2,
            "page_size": 10,
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["page"] == 2
    assert data["page_size"] == 10

    assert captured["user_id"] == TEST_USER_ID
    assert captured["account_status"].value == "active"
    assert captured["risk_level"].value == "high"
    assert captured["renewal_within_days"] == 30
    assert captured["has_open_tasks"] is True
    assert captured["offset"] == 10
    assert captured["limit"] == 10


@pytest.mark.parametrize(
    "params",
    [
        {"renewal_within_days": "-1"},
        {"renewal_within_days": "3651"},
        {"has_open_tasks": "maybe"},
        {"page": "0"},
        {"page_size": "101"},
    ],
)
def test_invalid_filter_or_pagination_values_return_422(
    authenticated_client,
    params,
):
    response = authenticated_client.get("/api/v1/accounts", params=params)

    assert response.status_code == 422, response.text


def test_accounts_endpoint_requires_authentication(anonymous_client):
    response = anonymous_client.get("/api/v1/accounts")

    assert response.status_code == 401, response.text