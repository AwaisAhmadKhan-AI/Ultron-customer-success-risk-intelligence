from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.enums import RiskSignalOrigin, RiskSignalStatus
from app.models.interaction import Interaction
from app.models.risk_signal import RiskSignal
from app.schemas.risk_signal import RiskSignalCreate


def validate_sources(
    db: Session,
    account_id: UUID,
    interaction_id: UUID | None,
    document_id: UUID | None,
) -> None:
    if interaction_id is not None:
        interaction = db.scalar(
            select(Interaction.id).where(
                Interaction.id == interaction_id,
                Interaction.account_id == account_id,
                Interaction.archived_at.is_(None),
            )
        )
        if interaction is None:
            raise HTTPException(
                422,
                "Source interaction must be active and belong to this account.",
            )

    if document_id is not None:
        document = db.scalar(
            select(Document.id).where(
                Document.id == document_id,
                Document.account_id == account_id,
                Document.archived_at.is_(None),
            )
        )
        if document is None:
            raise HTTPException(
                422,
                "Source document must be active and belong to this account.",
            )


def list_risk_signals(
    db: Session,
    account_id: UUID,
    *,
    signal_status: RiskSignalStatus | None,
    offset: int,
    limit: int,
) -> tuple[list[RiskSignal], int]:
    filters = [RiskSignal.account_id == account_id]

    if signal_status is not None:
        filters.append(RiskSignal.status == signal_status)

    total = db.scalar(
        select(func.count(RiskSignal.id)).where(*filters)
    ) or 0

    items = list(
        db.scalars(
            select(RiskSignal)
            .where(*filters)
            .order_by(RiskSignal.created_at.desc())
            .offset(offset)
            .limit(limit)
        ).all()
    )

    return items, total


def get_risk_signal(
    db: Session,
    account_id: UUID,
    signal_id: UUID,
) -> RiskSignal:
    signal = db.scalar(
        select(RiskSignal).where(
            RiskSignal.id == signal_id,
            RiskSignal.account_id == account_id,
        )
    )

    if signal is None:
        raise HTTPException(404, "Risk signal not found.")

    return signal


def create_risk_signal(
    db: Session,
    account_id: UUID,
    user_id: UUID,
    payload: RiskSignalCreate,
) -> RiskSignal:
    validate_sources(
        db,
        account_id,
        payload.source_interaction_id,
        payload.source_document_id,
    )

    signal = RiskSignal(
        account_id=account_id,
        created_by_user_id=user_id,
        origin=RiskSignalOrigin.MANUAL,
        status=RiskSignalStatus.ACTIVE,
        **payload.model_dump(),
    )

    db.add(signal)

    try:
        db.commit()
        db.refresh(signal)
        return signal
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            409,
            "Risk signal could not be created.",
        ) from exc


def acknowledge_risk_signal(
    db: Session,
    signal: RiskSignal,
) -> RiskSignal:
    if signal.status == RiskSignalStatus.ACKNOWLEDGED:
        return signal

    if signal.status != RiskSignalStatus.ACTIVE:
        raise HTTPException(
            409,
            "Only active risk signals can be acknowledged.",
        )

    signal.status = RiskSignalStatus.ACKNOWLEDGED
    signal.acknowledged_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(signal)
        return signal
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Could not acknowledge signal.") from exc


def resolve_risk_signal(
    db: Session,
    signal: RiskSignal,
) -> RiskSignal:
    if signal.status == RiskSignalStatus.RESOLVED:
        return signal

    if signal.status not in (
        RiskSignalStatus.ACTIVE,
        RiskSignalStatus.ACKNOWLEDGED,
    ):
        raise HTTPException(
            409,
            "Only active or acknowledged signals can be resolved.",
        )

    signal.status = RiskSignalStatus.RESOLVED
    signal.resolved_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(signal)
        return signal
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Could not resolve signal.") from exc


def dismiss_risk_signal(
    db: Session,
    signal: RiskSignal,
    reason: str,
) -> RiskSignal:
    if signal.status not in (
        RiskSignalStatus.ACTIVE,
        RiskSignalStatus.ACKNOWLEDGED,
    ):
        raise HTTPException(
            409,
            "Only active or acknowledged signals can be dismissed.",
        )

    reason = reason.strip()
    if not reason:
        raise HTTPException(422, "Dismissal reason is required.")

    signal.status = RiskSignalStatus.DISMISSED
    signal.dismissed_reason = reason
    signal.dismissed_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(signal)
        return signal
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Could not dismiss signal.") from exc