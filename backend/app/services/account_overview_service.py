from uuid import UUID

from sqlalchemy.orm import Session

from app.models.account import Account
from app.repositories.account_overview_repository import (
    get_account_overview_data,
)
from app.schemas.account_overview import AccountOverviewResponse


def get_account_overview(
    db: Session,
    account: Account,
) -> AccountOverviewResponse:
    related_data = get_account_overview_data(
        db,
        account.id,
    )

    return AccountOverviewResponse(
        account=account,
        **related_data,
    )