from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.main import app
from app.models.enums import UserRole
from app.models.user import User


@pytest.fixture
def admin_users_context():
    """Use only the dedicated ultron_test database and roll back each test."""
    configured_url = settings.database_url
    if hasattr(configured_url, "get_secret_value"):
        configured_url = configured_url.get_secret_value()
    database_url = make_url(str(configured_url))
    assert database_url.database == "ultron_test", (
        "Admin user integration tests must use the dedicated ultron_test database."
    )

    engine = create_engine(database_url, pool_pre_ping=True)
    connection = engine.connect()
    outer_transaction = connection.begin()
    session = Session(bind=connection, autoflush=True, expire_on_commit=False)
    previous_overrides = app.dependency_overrides.copy()

    try:
        assert connection.execute(text("SELECT current_database()")).scalar_one() == "ultron_test"

        def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db
        with TestClient(app) as client:
            yield client, session
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)
        session.close()
        if outer_transaction.is_active:
            outer_transaction.rollback()
        connection.close()
        engine.dispose()


def _create_user(db: Session, email: str, role: UserRole) -> User:
    user = User(
        full_name="Test User",
        email=email,
        password_hash=hash_password("Test-password-for-admin-tests-2026!"),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def _token(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


def _payload(**overrides) -> dict[str, str]:
    value = {
        "full_name": "New Customer Success Manager",
        "email": "New.CSM@Ultron.Local",
        "password": "Correct-Horse-Battery-9!",
    }
    value.update(overrides)
    return value


def test_admin_create_user_requires_authentication(admin_users_context):
    client, _ = admin_users_context
    response = client.post("/api/v1/admin/users", json=_payload())
    assert response.status_code == 401


def test_csm_cannot_create_users(admin_users_context):
    client, db = admin_users_context
    csm = _create_user(db, "csm-no-admin@ultron.local", UserRole.CSM)
    response = client.post(
        "/api/v1/admin/users",
        json=_payload(),
        headers=_token(csm),
    )
    assert response.status_code == 403


def test_admin_can_create_csm_with_normalized_email_and_hashed_password(admin_users_context):
    client, db = admin_users_context
    admin = _create_user(db, "admin-create@ultron.local", UserRole.ADMIN_MANAGER)
    response = client.post(
        "/api/v1/admin/users",
        json=_payload(),
        headers=_token(admin),
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["email"] == "new.csm@ultron.local"
    assert body["role"] == "csm"
    assert body["is_active"] is True
    assert "password_hash" not in body
    assert "password" not in body

    created = db.scalar(select(User).where(User.email == "new.csm@ultron.local"))
    assert created is not None
    assert created.role == UserRole.CSM
    assert created.password_hash != "Correct-Horse-Battery-9!"
    assert verify_password("Correct-Horse-Battery-9!", created.password_hash)


def test_admin_cannot_assign_admin_role_through_create_user_endpoint(admin_users_context):
    client, db = admin_users_context
    admin = _create_user(db, "admin-role-test@ultron.local", UserRole.ADMIN_MANAGER)
    response = client.post(
        "/api/v1/admin/users",
        json=_payload(role="admin_manager"),
        headers=_token(admin),
    )
    assert response.status_code == 422


def test_admin_create_user_rejects_duplicate_email_case_insensitively(admin_users_context):
    client, db = admin_users_context
    admin = _create_user(db, "admin-duplicate@ultron.local", UserRole.ADMIN_MANAGER)
    _create_user(db, "already-exists@ultron.local", UserRole.CSM)
    response = client.post(
        "/api/v1/admin/users",
        json=_payload(email="ALREADY-EXISTS@ULTRON.LOCAL"),
        headers=_token(admin),
    )
    assert response.status_code == 409


def test_admin_create_user_rejects_short_password(admin_users_context):
    client, db = admin_users_context
    admin = _create_user(db, "admin-password-test@ultron.local", UserRole.ADMIN_MANAGER)
    response = client.post(
        "/api/v1/admin/users",
        json=_payload(password="too-short"),
        headers=_token(admin),
    )
    assert response.status_code == 422
