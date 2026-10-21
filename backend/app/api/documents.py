from typing import Annotated
from uuid import UUID
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    get_authorized_account,
    get_current_user,
    get_db,
)
from app.models.account import Account
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentListResponse, DocumentRead
from app.services import document_service


router = APIRouter(
    prefix="/accounts/{account_id}/documents",
    tags=["Documents"],
)


@router.post(
    "",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    account: Annotated[Account, Depends(get_authorized_account)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile, File()],
    title: Annotated[str | None, Form()] = None,
) -> Document:
    content = await file.read(document_service.MAX_UPLOAD_BYTES + 1)

    return document_service.upload_and_ingest_document(
        db=db,
        account=account,
        user=current_user,
        filename=file.filename or "",
        requested_title=title,
        content=content,
    )


@router.get("", response_model=DocumentListResponse)
def list_documents(
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
    include_archived: bool = Query(default=False),
) -> DocumentListResponse:
    items, total = document_service.list_account_documents(
        db,
        account.id,
        include_archived=include_archived,
    )

    return DocumentListResponse(items=items, total=total)


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(
    document_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> Document:
    document = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.account_id == account.id,
        )
    )

    if document is None or document.archived_at is not None:
        raise HTTPException(404, "Document not found.")

    return document


@router.post("/{document_id}/archive", response_model=DocumentRead)
def archive_document(
    document_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> Document:
    document = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.account_id == account.id,
        )
    )

    if document is None:
        raise HTTPException(404, "Document not found.")

    if document.archived_at is None:
        document.archived_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(document)

    return document