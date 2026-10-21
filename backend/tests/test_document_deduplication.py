from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.services import document_service


def test_duplicate_document_upload_returns_409_without_saving(
    tmp_path,
    monkeypatch,
):
    account = SimpleNamespace(id=uuid4())
    user = SimpleNamespace(id=uuid4())

    db = Mock()
    db.scalar.return_value = uuid4()

    monkeypatch.setattr(
        document_service,
        "STORAGE_ROOT",
        tmp_path,
    )
    monkeypatch.setattr(
        document_service,
        "validate_and_extract",
        lambda filename, content: (
            "account-update.txt",
            "text/plain",
            "Existing customer account update.",
        ),
    )

    with pytest.raises(HTTPException) as exc_info:
        document_service.upload_and_ingest_document(
            db=db,
            account=account,
            user=user,
            filename="account-update.txt",
            requested_title=None,
            content=b"Existing customer account update.",
        )

    assert exc_info.value.status_code == 409
    assert "already exists" in exc_info.value.detail.lower()

    db.add.assert_not_called()
    db.commit.assert_not_called()

    assert list(tmp_path.rglob("*")) == []
