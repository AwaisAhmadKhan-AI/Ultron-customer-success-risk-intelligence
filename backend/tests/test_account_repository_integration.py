from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Account, AccountAssignment, Task, User
from app.models.enums import (
    AccountStatus,
    RiskLevel,
    TaskPriority,
    TaskStatus,
    UserRole,
)
from app.repositories.account_repository import list_assigned_accounts


def _get_url_value(value):
    if hasattr(value, "get_secret_value"):
        return value.get_secret_value()
    return str(value)


@pytest.fixture
def db_session():
    # Never run these integration tests against the development database.
    database_url = make_url(
        _get_url_value(settings.database_url)
    ).set(database="ultron_test")

    assert database_url.database == "ultron_test"

    engine = create_engine(database_url, pool_pre_ping=True)
    connection = engine.connect()
    transaction = connection.begin()
    session = None

    try:
        database_name = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        assert database_name == "ultron_test", (
            f"Unsafe test database: {database_name}"
        )

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


def _create_user(db, suffix):
    user = User(
        email=f"integration-{suffix}@example.test",
        full_name=f"Integration CSM {suffix}",
        role=UserRole.CSM,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def _create_account(
    db,
    *,
    owner,
    name,
    renewal_date=None,
    archived=False,
    status=AccountStatus.ACTIVE,
    risk_level=None,
):
    account = Account(
        name=name,
        owner_user_id=owner.id,
        status=status,
        risk_level=risk_level,
        renewal_date=renewal_date,
        is_archived=archived,
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


def _create_task(db, *, account, user, status):
    completed_at = (
        datetime.now(timezone.utc)
        if status == TaskStatus.COMPLETED
        else None
    )

    task = Task(
        account_id=account.id,
        assigned_to_user_id=user.id,
        created_by_user_id=user.id,
        title=f"Integration test task for {account.name}",
        status=status,
        priority=TaskPriority.MEDIUM,
        completed_at=completed_at,
    )
    db.add(task)
    db.flush()
    return task


def _list_accounts(db, user_id, **overrides):
    params = {
        "q": None,
        "status": None,
        "risk_level": None,
        "include_archived": False,
        "offset": 0,
        "limit": 100,
        "renewal_within_days": None,
        "has_open_tasks": None,
    }
    params.update(overrides)

    return list_assigned_accounts(db, user_id, **params)


def test_renewal_filter_uses_date_window_and_excludes_archived(db_session):
    csm_a = _create_user(db_session, "renewal-a")
    csm_b = _create_user(db_session, "renewal-b")

    today = date.today()

    _create_account(
        db_session,
        owner=csm_a,
        name="Renewal Today",
        renewal_date=today,
    )
    _create_account(
        db_session,
        owner=csm_a,
        name="Renewal At Boundary",
        renewal_date=today + timedelta(days=30),
    )
    _create_account(
        db_session,
        owner=csm_a,
        name="Renewal Too Late",
        renewal_date=today + timedelta(days=31),
    )
    _create_account(
        db_session,
        owner=csm_a,
        name="No Renewal Date",
        renewal_date=None,
    )
    _create_account(
        db_session,
        owner=csm_a,
        name="Archived Renewal",
        renewal_date=today + timedelta(days=5),
        archived=True,
    )
    _create_account(
        db_session,
        owner=csm_b,
        name="Other CSM Renewal",
        renewal_date=today + timedelta(days=5),
    )

    items, total = _list_accounts(
        db_session,
        csm_a.id,
        renewal_within_days=30,
    )

    assert total == 2
    assert {item.name for item in items} == {
        "Renewal Today",
        "Renewal At Boundary",
    }


def test_open_task_filter_includes_open_and_in_progress(db_session):
    csm = _create_user(db_session, "tasks")

    open_account = _create_account(
        db_session,
        owner=csm,
        name="Account With Open Task",
    )
    in_progress_account = _create_account(
        db_session,
        owner=csm,
        name="Account With In Progress Task",
    )
    completed_account = _create_account(
        db_session,
        owner=csm,
        name="Account With Completed Task",
    )
    no_task_account = _create_account(
        db_session,
        owner=csm,
        name="Account With No Tasks",
    )

    _create_task(
        db_session,
        account=open_account,
        user=csm,
        status=TaskStatus.OPEN,
    )
    _create_task(
        db_session,
        account=in_progress_account,
        user=csm,
        status=TaskStatus.IN_PROGRESS,
    )
    _create_task(
        db_session,
        account=completed_account,
        user=csm,
        status=TaskStatus.COMPLETED,
    )

    open_items, open_total = _list_accounts(
        db_session,
        csm.id,
        has_open_tasks=True,
    )

    assert open_total == 2
    assert {item.name for item in open_items} == {
        "Account With Open Task",
        "Account With In Progress Task",
    }

    closed_items, closed_total = _list_accounts(
        db_session,
        csm.id,
        has_open_tasks=False,
    )

    assert closed_total == 2
    assert {item.name for item in closed_items} == {
        "Account With Completed Task",
        "Account With No Tasks",
    }


def test_account_list_never_returns_another_csms_accounts(db_session):
    csm_a = _create_user(db_session, "isolation-a")
    csm_b = _create_user(db_session, "isolation-b")

    _create_account(
        db_session,
        owner=csm_a,
        name="CSM A Private Account",
    )
    _create_account(
        db_session,
        owner=csm_b,
        name="CSM B Private Account",
    )

    items, total = _list_accounts(db_session, csm_a.id)

    assert total == 1
    assert {item.name for item in items} == {
        "CSM A Private Account"
    }


def test_combined_filters_and_pagination_work_together(db_session):
    csm = _create_user(db_session, "combined")

    _create_account(
        db_session,
        owner=csm,
        name="Acme Alpha",
        status=AccountStatus.ACTIVE,
        risk_level=RiskLevel.HIGH,
    )
    _create_account(
        db_session,
        owner=csm,
        name="Acme Beta",
        status=AccountStatus.ACTIVE,
        risk_level=RiskLevel.HIGH,
    )
    _create_account(
        db_session,
        owner=csm,
        name="Acme Medium Risk",
        status=AccountStatus.ACTIVE,
        risk_level=RiskLevel.MEDIUM,
    )
    _create_account(
        db_session,
        owner=csm,
        name="Other High Risk",
        status=AccountStatus.ACTIVE,
        risk_level=RiskLevel.HIGH,
    )
    _create_account(
        db_session,
        owner=csm,
        name="Acme Churned",
        status=AccountStatus.CHURNED,
        risk_level=RiskLevel.HIGH,
    )

    common_filters = {
        "q": "Acme",
        "status": AccountStatus.ACTIVE,
        "risk_level": RiskLevel.HIGH,
    }

    page_one, total = _list_accounts(
        db_session,
        csm.id,
        offset=0,
        limit=1,
        **common_filters,
    )
    page_two, total_again = _list_accounts(
        db_session,
        csm.id,
        offset=1,
        limit=1,
        **common_filters,
    )

    assert total == 2
    assert total_again == 2
    assert len(page_one) == 1
    assert len(page_two) == 1
    assert page_one[0].id != page_two[0].id
    assert {page_one[0].name, page_two[0].name} == {
        "Acme Alpha",
        "Acme Beta",
    }