from hashlib import sha256
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.account import Account
from app.models.document import Document
from app.models.enums import AccountStatus, DocumentIngestionStatus, UserRole
from app.models.user import User
from app.services import document_service


def _url_value(value):
    if hasattr(value, "get_secret_value"):
        return value.get_secret_value()
    return str(value)


@pytest.fixture
def db_session():
    # These integration tests must never run against the development DB.
    database_url = make_url(
        _url_value(settings.database_url)
    ).set(database="ultron_test")

    assert database_url.database == "ultron_test"

    engine = create_engine(database_url, pool_pre_ping=True)
    connection = engine.connect()
    outer_transaction = connection.begin()
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

        if outer_transaction.is_active:
            outer_transaction.rollback()

        connection.close()
        engine.dispose()


def _create_account_and_user(db):
    suffix = uuid4().hex

    user = User(
        email=f"document-dedup-{suffix}@example.test",
        full_name="Document Deduplication Test",
        role=UserRole.CSM,
        is_active=True,
    )
    db.add(user)
    db.flush()

    account = Account(
        name=f"Document Deduplication Account {suffix}",
        owner_user_id=user.id,
        status=AccountStatus.ACTIVE,
        risk_level=None,
        renewal_date=None,
        is_archived=False,
    )
    db.add(account)
    db.flush()

    return account, user


def _create_document(account, user, content, filename="existing.txt"):
    return Document(
        account_id=account.id,
        uploaded_by_user_id=user.id,
        title="Existing customer update",
        original_filename=filename,
        mime_type="text/plain",
        size_bytes=len(content),
        content_sha256=sha256(content).hexdigest(),
        storage_key=f"{account.id}/{uuid4()}.txt",
        ingestion_status=DocumentIngestionStatus.UPLOADED,
    )


def test_duplicate_upload_returns_409_using_real_test_database(
    db_session,
    tmp_path,
    monkeypatch,
):
    account, user = _create_account_and_user(db_session)
    content = b"Existing customer account update for deduplication."

    existing_document = _create_document(account, user, content)
    db_session.add(existing_document)
    db_session.flush()

    monkeypatch.setattr(
        document_service,
        "STORAGE_ROOT",
        tmp_path,
    )

    with pytest.raises(HTTPException) as exc_info:
        document_service.upload_and_ingest_document(
            db=db_session,
            account=account,
            user=user,
            filename="duplicate.txt",
            requested_title=None,
            content=content,
        )

    assert exc_info.value.status_code == 409
    assert "already exists" in exc_info.value.detail.lower()

    document_count = db_session.scalar(
        select(func.count())
        .select_from(Document)
        .where(Document.account_id == account.id)
    )
    assert document_count == 1
    assert list(tmp_path.rglob("*")) == []


def test_database_unique_constraint_rejects_duplicate_content_hash(
    db_session,
):
    account, user = _create_account_and_user(db_session)
    content = b"Duplicate hash database constraint test."

    existing_document = _create_document(account, user, content)
    db_session.add(existing_document)
    db_session.flush()

    duplicate_document = _create_document(
        account,
        user,
        content,
        filename="different-name-same-content.txt",
    )

    with pytest.raises(IntegrityError):
        with db_session.begin_nested():
            db_session.add(duplicate_document)
            db_session.flush()

    document_count = db_session.scalar(
        select(func.count())
        .select_from(Document)
        .where(
            Document.account_id == account.id,
            Document.content_sha256 == sha256(content).hexdigest(),
        )
    )
    assert document_count == 1
