from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.main import app
from app.models import Account, AccountAssignment, User
from app.models.enums import AccountStatus, UserRole


def _get_url_value(value):
    if hasattr(value, "get_secret_value"):
        return value.get_secret_value()
    return str(value)


@pytest.fixture
def db_session():
    database_url = make_url(
        _get_url_value(settings.database_url)
    ).set(database="ultron_test")

    assert database_url.database == "ultron_test", (
        "Safety check failed: tests must use ultron_test"
    )

    engine = create_engine(database_url, pool_pre_ping=True)
    connection = engine.connect()
    transaction = connection.begin()
    session = None

    try:
        database_name = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        assert database_name == "ultron_test"

        session = Session(
            bind=connection,
            autoflush=True,
            expire_on_commit=False,
        )

        yield session

    finally:
        if session is not None:
            session.close()

        if transaction.is_active:
            transaction.rollback()

        connection.close()
        engine.dispose()


@pytest.fixture
def api_context(db_session):
    previous_overrides = app.dependency_overrides.copy()
    active_user = {"value": None}

    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = (
        lambda: active_user["value"]
    )

    try:
        with TestClient(app) as client:
            yield client, active_user
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def create_user(db, suffix):
    user = User(
        email=f"api-integration-{suffix}@example.test",
        full_name=f"API Integration CSM {suffix}",
        role=UserRole.CSM,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def create_account(db, owner, name):
    account = Account(
        name=name,
        owner_user_id=owner.id,
        status=AccountStatus.ACTIVE,
        is_archived=False,
    )
    db.add(account)
    db.flush()

    db.add(
        AccountAssignment(
            account_id=account.id,
            user_id=owner.id,
            assigned_by_user_id=owner.id,
        )
    )
    db.flush()

    return account


def test_account_detail_enforces_assignment_boundary(
    api_context,
    db_session,
):
    client, active_user = api_context

    csm_a = create_user(db_session, "detail-a")
    csm_b = create_user(db_session, "detail-b")

    account_a = create_account(
        db_session,
        csm_a,
        "API Integration Account A",
    )
    account_b = create_account(
        db_session,
        csm_b,
        "API Integration Account B",
    )

    active_user["value"] = csm_a

    own_response = client.get(
        f"/api/v1/accounts/{account_a.id}"
    )
    other_response = client.get(
        f"/api/v1/accounts/{account_b.id}"
    )
    missing_response = client.get(
        f"/api/v1/accounts/{uuid4()}"
    )

    assert own_response.status_code == 200, own_response.text
    assert own_response.json()["id"] == str(account_a.id)

    assert other_response.status_code == 403, other_response.text
    assert missing_response.status_code == 404, missing_response.text


def test_account_list_only_returns_assigned_accounts(
    api_context,
    db_session,
):
    client, active_user = api_context

    csm_a = create_user(db_session, "list-a")
    csm_b = create_user(db_session, "list-b")

    account_a1 = create_account(
        db_session,
        csm_a,
        "API List Account A1",
    )
    account_a2 = create_account(
        db_session,
        csm_a,
        "API List Account A2",
    )
    create_account(
        db_session,
        csm_b,
        "API List Private Account B",
    )

    active_user["value"] = csm_a

    response = client.get("/api/v1/accounts")

    assert response.status_code == 200, response.text

    data = response.json()
    returned_ids = {item["id"] for item in data["items"]}

    assert data["total"] == 2
    assert returned_ids == {
        str(account_a1.id),
        str(account_a2.id),
    }
    assert all(
        item["name"] != "API List Private Account B"
        for item in data["items"]
    )