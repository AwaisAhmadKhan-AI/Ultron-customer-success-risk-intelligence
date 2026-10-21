from typing import Annotated

from fastapi import APIRouter, Depends, Query, status as http_status
from sqlalchemy.orm import Session

from app.api.deps import (
    get_authorized_account,
    get_current_user,
    get_db,
)
from app.models.account import Account
from app.models.enums import AccountStatus, RiskLevel
from app.models.user import User

from app.schemas.account import (
    AccountCreate,
    AccountListResponse,
    AccountRead,
    AccountUpdate,
)
from app.services import account_service


router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.post(
    "",
    response_model=AccountRead,
    status_code=http_status.HTTP_201_CREATED,
)
def create_account(
    payload: AccountCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Account:
    return account_service.create_account(db, current_user, payload)


@router.get("", response_model=AccountListResponse)
def list_accounts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    q: str | None = Query(default=None, max_length=200),
    account_status: AccountStatus | None = Query(
        default=None,
        alias="status",
    ),
    risk_level: RiskLevel | None = None,
    include_archived: bool = False,
    renewal_within_days: int | None = Query(
        default=None,
        ge=0,
        le=3650,
    ),
    has_open_tasks: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> AccountListResponse:
    items, total = account_service.list_accounts(
        db,
        current_user.id,
        q=q,
        account_status=account_status,
        risk_level=risk_level,
        include_archived=include_archived,
        offset=(page - 1) * page_size,
        limit=page_size,
        renewal_within_days=renewal_within_days,
        has_open_tasks=has_open_tasks,
    )

    return AccountListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{account_id}", response_model=AccountRead)
def get_account(
    account: Annotated[Account, Depends(get_authorized_account)],
) -> Account:
    return account


@router.patch("/{account_id}", response_model=AccountRead)
def patch_account(
    payload: AccountUpdate,
    db: Annotated[Session, Depends(get_db)],
    account: Annotated[Account, Depends(get_authorized_account)],
) -> Account:
    return account_service.update_account(db, account, payload)


@router.post(
    "/{account_id}/archive",
    response_model=AccountRead,
)
def archive_account(
    db: Annotated[Session, Depends(get_db)],
    account: Annotated[Account, Depends(get_authorized_account)],
) -> Account:
    return account_service.set_account_archived(db, account, True)


@router.post(
    "/{account_id}/unarchive",
    response_model=AccountRead,
)
def unarchive_account(
    db: Annotated[Session, Depends(get_db)],
    account: Annotated[Account, Depends(get_authorized_account)],
) -> Account:
    return account_service.set_account_archived(db, account, False)