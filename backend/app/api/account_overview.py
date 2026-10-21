from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_authorized_account, get_db
from app.models.account import Account
from app.schemas.account_overview import AccountOverviewResponse
from app.services.account_overview_service import get_account_overview


router = APIRouter(
    prefix="/accounts",
    tags=["Account Overview"],
)


@router.get(
    "/{account_id}/overview",
    response_model=AccountOverviewResponse,
)
def read_account_overview(
    account_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> AccountOverviewResponse:
    return get_account_overview(db, account)