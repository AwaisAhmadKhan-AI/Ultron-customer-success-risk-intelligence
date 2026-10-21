from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate


def list_contacts(
    db: Session,
    account_id: UUID,
    *,
    q: str | None,
    include_archived: bool,
    offset: int,
    limit: int,
) -> tuple[list[Contact], int]:
    statement = select(Contact).where(Contact.account_id == account_id)

    if not include_archived:
        statement = statement.where(Contact.archived_at.is_(None))

    if q and q.strip():
        search = f"%{q.strip()}%"
        statement = statement.where(
            (Contact.first_name.ilike(search))
            | (Contact.last_name.ilike(search))
            | (Contact.email.ilike(search))
        )

    count_statement = (
        select(func.count())
        .select_from(statement.subquery())
    )
    total = db.scalar(count_statement) or 0

    items = list(
        db.scalars(
            statement
            .order_by(Contact.created_at.desc())
            .offset(offset)
            .limit(limit)
        ).all()
    )
    return items, total


def get_contact(
    db: Session,
    account_id: UUID,
    contact_id: UUID,
) -> Contact:
    contact = db.scalar(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.account_id == account_id,
        )
    )
    if contact is None or contact.archived_at is not None:
        raise HTTPException(404, "Contact not found.")
    return contact


def create_contact(
    db: Session,
    account_id: UUID,
    payload: ContactCreate,
) -> Contact:
    contact = Contact(account_id=account_id, **payload.model_dump())
    db.add(contact)
    try:
        db.commit()
        db.refresh(contact)
        return contact
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Contact could not be created.") from exc


def update_contact(
    db: Session,
    contact: Contact,
    payload: ContactUpdate,
) -> Contact:
    changes = payload.model_dump(exclude_unset=True)

    for field in ("first_name", "last_name"):
        if field in changes and changes[field] is None:
            raise HTTPException(422, f"{field} cannot be null.")

    if not changes:
        raise HTTPException(422, "Provide at least one field to update.")

    for field, value in changes.items():
        setattr(contact, field, value)

    try:
        db.commit()
        db.refresh(contact)
        return contact
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Contact update failed.") from exc


def archive_contact(db: Session, contact: Contact) -> Contact:
    contact.archived_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(contact)
    return contact