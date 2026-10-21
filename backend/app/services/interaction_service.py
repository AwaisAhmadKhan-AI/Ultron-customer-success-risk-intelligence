from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.contact import Contact
from app.models.interaction import Interaction
from app.schemas.interaction import InteractionCreate, InteractionUpdate


def validate_contact(
    db: Session,
    account_id: UUID,
    contact_id: UUID | None,
) -> None:
    if contact_id is None:
        return

    contact = db.scalar(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.account_id == account_id,
            Contact.archived_at.is_(None),
        )
    )

    if contact is None:
        raise HTTPException(
            422,
            "Contact must exist, be active, and belong to this account.",
        )


def list_interactions(
    db: Session,
    account_id: UUID,
    *,
    include_archived: bool,
    offset: int,
    limit: int,
) -> tuple[list[Interaction], int]:
    statement = select(Interaction).where(
        Interaction.account_id == account_id
    )

    if not include_archived:
        statement = statement.where(Interaction.archived_at.is_(None))

    total = db.scalar(
        select(func.count()).select_from(statement.subquery())
    ) or 0

    items = list(
        db.scalars(
            statement
            .order_by(Interaction.occurred_at.desc())
            .offset(offset)
            .limit(limit)
        ).all()
    )
    return items, total


def get_interaction(
    db: Session,
    account_id: UUID,
    interaction_id: UUID,
) -> Interaction:
    interaction = db.scalar(
        select(Interaction).where(
            Interaction.id == interaction_id,
            Interaction.account_id == account_id,
        )
    )
    if interaction is None or interaction.archived_at is not None:
        raise HTTPException(404, "Interaction not found.")
    return interaction


def create_interaction(
    db: Session,
    account_id: UUID,
    user_id: UUID,
    payload: InteractionCreate,
) -> Interaction:
    validate_contact(db, account_id, payload.contact_id)

    interaction = Interaction(
        account_id=account_id,
        created_by_user_id=user_id,
        **payload.model_dump(),
    )
    db.add(interaction)
    try:
        db.commit()
        db.refresh(interaction)
        return interaction
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            409,
            "Interaction could not be created.",
        ) from exc


def update_interaction(
    db: Session,
    interaction: Interaction,
    payload: InteractionUpdate,
) -> Interaction:
    changes = payload.model_dump(exclude_unset=True)

    for field in ("interaction_type", "summary", "occurred_at"):
        if field in changes and changes[field] is None:
            raise HTTPException(422, f"{field} cannot be null.")

    if not changes:
        raise HTTPException(422, "Provide at least one field to update.")

    if "contact_id" in changes:
        validate_contact(
            db,
            interaction.account_id,
            changes["contact_id"],
        )

    for field, value in changes.items():
        setattr(interaction, field, value)

    try:
        db.commit()
        db.refresh(interaction)
        return interaction
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Interaction update failed.") from exc


def archive_interaction(db: Session, interaction: Interaction) -> Interaction:
    interaction.archived_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(interaction)
    return interaction