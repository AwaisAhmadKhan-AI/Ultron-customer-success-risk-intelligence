from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.account_assignment import AccountAssignment
from app.models.enums import AccountStatus, RiskLevel
from app.models.user import User
from app.repositories import account_repository
from app.schemas.account import AccountCreate, AccountUpdate


def list_accounts(
    db: Session,
    user_id: UUID,
    *,
    q: str | None = None,
    account_status: AccountStatus | None = None,
    risk_level: RiskLevel | None = None,
    include_archived: bool = False,
    offset: int = 0,
    limit: int = 20,
    renewal_within_days: int | None = None,
    has_open_tasks: bool | None = None,
) -> tuple[list[Account], int]:
    # Access scope (user_id assignment) is enforced inside the repository.
    return account_repository.list_assigned_accounts(
        db,
        user_id,
        q=q,
        status=account_status,
        risk_level=risk_level,
        include_archived=include_archived,
        offset=offset,
        limit=limit,
        renewal_within_days=renewal_within_days,
        has_open_tasks=has_open_tasks,
    )


def create_account(
    db: Session,
    current_user: User,
    payload: AccountCreate,
) -> Account:
    account = Account(
        name=payload.name,
        owner_user_id=current_user.id,
        status=payload.status,
        risk_level=payload.risk_level,
        renewal_date=payload.renewal_date,
        is_archived=False,
    )

    try:
        account_repository.add_account(db, account)

        # The creator receives access through an explicit assignment.
        db.add(
            AccountAssignment(
                account_id=account.id,
                user_id=current_user.id,
                assigned_by_user_id=current_user.id,
            )
        )

        db.commit()
        db.refresh(account)
        return account

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account could not be created due to a data conflict.",
        ) from exc


def update_account(
    db: Session,
    account: Account,
    payload: AccountUpdate,
) -> Account:
    changes = payload.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide at least one field to update.",
        )

    # These fields must not be explicitly set to null.
    for field in ("name", "status"):
        if field in changes and changes[field] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field} cannot be null.",
            )

    for field, value in changes.items():
        setattr(account, field, value)

    try:
        account_repository.save_account(db, account)
        db.commit()
        db.refresh(account)
        return account

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account could not be updated due to a data conflict.",
        ) from exc


def set_account_archived(
    db: Session,
    account: Account,
    archived: bool,
) -> Account:
    account.is_archived = archived

    try:
        account_repository.save_account(db, account)
        db.commit()
        db.refresh(account)
        return account

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account archive state could not be changed.",
        ) from exc