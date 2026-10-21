from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.enums import UserRole
from app.models.user import User


PASSWORD = "Correct-Test-Password-123!"


def get_url_value(value):
    if hasattr(value, "get_secret_value"):
        return value.get_secret_value()
    return str(value)


@pytest.fixture
def auth_context():
    # Safety guard: authentication integration tests use ultron_test only.
    database_url = make_url(
        get_url_value(settings.database_url)
    ).set(database="ultron_test")

    assert database_url.database == "ultron_test"

    engine = create_engine(database_url, pool_pre_ping=True)
    connection = engine.connect()
    outer_transaction = connection.begin()
    session = None
    previous_overrides = app.dependency_overrides.copy()

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

        def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db

        with TestClient(app) as client:
            yield client, session

    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)

        if session is not None:
            session.close()

        if outer_transaction.is_active:
            outer_transaction.rollback()

        connection.close()
        engine.dispose()


def create_test_user(
    db,
    *,
    active=True,
    password=PASSWORD,
    with_password=True,
    email=None,
):
    user = User(
        email=email or f"auth-test-{uuid4().hex}@example.test",
        full_name="Authentication Test User",
        role=UserRole.CSM,
        is_active=active,
        password_hash=(
            hash_password(password) if with_password else None
        ),
    )
    db.add(user)
    db.flush()
    return user


def login(client, email, password):
    return client.post(
        "/api/v1/auth/login",
        data={
            "username": email,
            "password": password,
        },
    )


def test_login_with_valid_credentials_returns_jwt(auth_context):
    client, db = auth_context
    user = create_test_user(db)

    response = login(client, user.email, PASSWORD)

    assert response.status_code == 200, response.text

    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]

    payload = jwt.decode(
        body["access_token"],
        settings.jwt_secret_key.get_secret_value(),
        algorithms=[settings.jwt_algorithm],
    )
    assert payload["sub"] == str(user.id)
    assert "exp" in payload
    assert "iat" in payload


def test_login_normalizes_email_case(auth_context):
    client, db = auth_context
    user = create_test_user(
        db,
        email=f"MixedCase-{uuid4().hex}@example.test",
    )

    response = login(client, user.email.upper(), PASSWORD)

    assert response.status_code == 200, response.text
    assert response.json()["access_token"]


def test_wrong_password_returns_401(auth_context):
    client, db = auth_context
    user = create_test_user(db)

    response = login(client, user.email, "Definitely-Wrong-Password!")

    assert response.status_code == 401
    assert response.headers.get("www-authenticate") == "Bearer"


def test_unknown_email_returns_401(auth_context):
    client, _ = auth_context

    response = login(
        client,
        f"missing-{uuid4().hex}@example.test",
        PASSWORD,
    )

    assert response.status_code == 401
    assert response.headers.get("www-authenticate") == "Bearer"


def test_user_without_password_hash_cannot_login(auth_context):
    client, db = auth_context
    user = create_test_user(db, with_password=False)

    response = login(client, user.email, PASSWORD)

    assert response.status_code == 401


def test_inactive_user_login_returns_403(auth_context):
    client, db = auth_context
    user = create_test_user(db, active=False)

    response = login(client, user.email, PASSWORD)

    assert response.status_code == 403
    assert response.json()["detail"] == "This user account is inactive"


def test_me_without_token_returns_401(auth_context):
    client, _ = auth_context

    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_me_with_invalid_token_returns_401(auth_context):
    client, _ = auth_context

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.token.value"},
    )

    assert response.status_code == 401


def test_me_with_expired_token_returns_401(auth_context):
    client, db = auth_context
    user = create_test_user(db)

    now = datetime.now(timezone.utc)
    expired_payload = {
        "sub": str(user.id),
        "iat": now - timedelta(minutes=10),
        "exp": now - timedelta(minutes=5),
    }
    expired_token = jwt.encode(
        expired_payload,
        settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )

    assert response.status_code == 401


def test_me_with_valid_token_returns_current_user(auth_context):
    client, db = auth_context
    user = create_test_user(db)
    token = create_access_token(str(user.id))

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text

    body = response.json()
    assert body["id"] == str(user.id)
    assert body["email"] == user.email
    assert body["full_name"] == user.full_name
    assert body["role"] == "csm"
    assert body["is_active"] is True


def test_inactive_user_with_existing_token_is_rejected(auth_context):
    client, db = auth_context
    user = create_test_user(db, active=False)
    token = create_access_token(str(user.id))

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401