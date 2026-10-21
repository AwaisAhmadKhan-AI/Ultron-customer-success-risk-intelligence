from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import (
    get_authorized_account,
    get_current_user,
    get_db,
)
from app.models.account import Account
from app.models.risk_signal import RiskSignal
from app.models.user import User
from app.models.enums import RiskSignalStatus
from app.schemas.risk_signal import (
    RiskSignalCreate,
    RiskSignalDismiss,
    RiskSignalListResponse,
    RiskSignalRead,
)
from app.services import risk_signal_service


router = APIRouter(
    prefix="/accounts/{account_id}/risk-signals",
    tags=["Risk Signals"],
)


@router.post(
    "",
    response_model=RiskSignalRead,
    status_code=status.HTTP_201_CREATED,
)
def create_risk_signal(
    payload: RiskSignalCreate,
    account: Annotated[Account, Depends(get_authorized_account)],
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RiskSignal:
    return risk_signal_service.create_risk_signal(
        db,
        account.id,
        user.id,
        payload,
    )


@router.get("", response_model=RiskSignalListResponse)
def list_risk_signals(
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
    signal_status: RiskSignalStatus | None = Query(
        default=None,
        alias="status",
    ),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> RiskSignalListResponse:
    items, total = risk_signal_service.list_risk_signals(
        db,
        account.id,
        signal_status=signal_status,
        offset=(page - 1) * page_size,
        limit=page_size,
    )

    return RiskSignalListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{signal_id}", response_model=RiskSignalRead)
def get_risk_signal(
    signal_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> RiskSignal:
    return risk_signal_service.get_risk_signal(
        db,
        account.id,
        signal_id,
    )


@router.post("/{signal_id}/acknowledge", response_model=RiskSignalRead)
def acknowledge_risk_signal(
    signal_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> RiskSignal:
    signal = risk_signal_service.get_risk_signal(
        db,
        account.id,
        signal_id,
    )
    return risk_signal_service.acknowledge_risk_signal(db, signal)


@router.post("/{signal_id}/resolve", response_model=RiskSignalRead)
def resolve_risk_signal(
    signal_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> RiskSignal:
    signal = risk_signal_service.get_risk_signal(
        db,
        account.id,
        signal_id,
    )
    return risk_signal_service.resolve_risk_signal(db, signal)


@router.post("/{signal_id}/dismiss", response_model=RiskSignalRead)
def dismiss_risk_signal(
    signal_id: UUID,
    payload: RiskSignalDismiss,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> RiskSignal:
    signal = risk_signal_service.get_risk_signal(
        db,
        account.id,
        signal_id,
    )
    return risk_signal_service.dismiss_risk_signal(
        db,
        signal,
        payload.reason,
    )