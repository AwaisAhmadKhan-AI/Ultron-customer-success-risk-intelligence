from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_authorized_account, get_db
from app.models.account import Account
from app.models.contact import Contact
from app.schemas.contact import (
    ContactCreate,
    ContactListResponse,
    ContactRead,
    ContactUpdate,
)
from app.services import contact_service


router = APIRouter(
    prefix="/accounts/{account_id}/contacts",
    tags=["Contacts"],
)


@router.post("", response_model=ContactRead, status_code=status.HTTP_201_CREATED)
def create_contact(
    payload: ContactCreate,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> Contact:
    return contact_service.create_contact(db, account.id, payload)


@router.get("", response_model=ContactListResponse)
def list_contacts(
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
    q: str | None = Query(default=None, max_length=200),
    include_archived: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> ContactListResponse:
    items, total = contact_service.list_contacts(
        db,
        account.id,
        q=q,
        include_archived=include_archived,
        offset=(page - 1) * page_size,
        limit=page_size,
    )
    return ContactListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{contact_id}", response_model=ContactRead)
def get_contact(
    contact_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> Contact:
    return contact_service.get_contact(db, account.id, contact_id)


@router.patch("/{contact_id}", response_model=ContactRead)
def patch_contact(
    contact_id: UUID,
    payload: ContactUpdate,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> Contact:
    contact = contact_service.get_contact(db, account.id, contact_id)
    return contact_service.update_contact(db, contact, payload)


@router.post("/{contact_id}/archive", response_model=ContactRead)
def archive_contact(
    contact_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> Contact:
    contact = contact_service.get_contact(db, account.id, contact_id)
    return contact_service.archive_contact(db, contact)