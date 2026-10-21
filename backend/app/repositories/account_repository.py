from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Account, AccountAssignment, Task
from app.models.enums import AccountStatus, RiskLevel, TaskStatus


def list_assigned_accounts(
    db: Session,
    user_id: UUID,
    *,
    q: str | None,
    status: AccountStatus | None,
    risk_level: RiskLevel | None,
    include_archived: bool,
    offset: int,
    limit: int,
    renewal_within_days: int | None = None,
    has_open_tasks: bool | None = None,
) -> tuple[list[Account], int]:
    # Access scope is applied before optional search filters.
    filters = [AccountAssignment.user_id == user_id]

    if not include_archived:
        filters.append(Account.is_archived.is_(False))

    if q and q.strip():
        filters.append(Account.name.ilike(f"%{q.strip()}%"))

    if status is not None:
        filters.append(Account.status == status)

    if risk_level is not None:
        filters.append(Account.risk_level == risk_level)

    # Upcoming renewals: today through the requested number of days.
    if renewal_within_days is not None:
        today = date.today()
        renewal_cutoff = today + timedelta(days=renewal_within_days)
        filters.append(Account.renewal_date >= today)
        filters.append(Account.renewal_date <= renewal_cutoff)

    # Detect unfinished tasks without joining Task into the account result,
    # which avoids duplicate account rows.
    open_task_exists = (
        select(Task.id)
        .where(
            Task.account_id == Account.id,
            Task.status.in_(
                [
                    TaskStatus.OPEN,
                    TaskStatus.IN_PROGRESS,
                ]
            ),
        )
        .exists()
    )

    if has_open_tasks is True:
        filters.append(open_task_exists)
    elif has_open_tasks is False:
        filters.append(~open_task_exists)

    total_statement = (
        select(func.count(Account.id))
        .join(
            AccountAssignment,
            AccountAssignment.account_id == Account.id,
        )
        .where(*filters)
    )
    total = db.scalar(total_statement) or 0

    statement = (
        select(Account)
        .join(
            AccountAssignment,
            AccountAssignment.account_id == Account.id,
        )
        .where(*filters)
        .order_by(Account.created_at.desc(), Account.id)
        .offset(offset)
        .limit(limit)
    )
    items = list(db.scalars(statement).all())

    return items, total


def add_account(db: Session, account: Account) -> None:
    db.add(account)
    db.flush()


def save_account(db: Session, account: Account) -> None:
    db.add(account)
    db.flush()