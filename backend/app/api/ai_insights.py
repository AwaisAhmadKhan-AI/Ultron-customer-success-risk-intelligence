from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    get_authorized_account,
    get_current_user,
    get_db,
)
from app.models.account import Account
from app.models.ai_insight import AIInsight
from app.models.user import User
from app.schemas.ai_insight import AIInsightCreate, AIInsightRead
from app.services.ai_insight_service import (
    _serialize_insight,
    analyze_account,
)


router = APIRouter(
    prefix="/accounts/{account_id}/ai-insights",
    tags=["AI Insights"],
)


@router.post(
    "",
    response_model=AIInsightRead,
    status_code=status.HTTP_201_CREATED,
)
def create_ai_insight(
    payload: AIInsightCreate,
    account: Annotated[Account, Depends(get_authorized_account)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AIInsightRead:
    return analyze_account(
        db=db,
        account_id=account.id,
        user=current_user,
        question=payload.question,
    )


@router.get(
    "/{insight_id}",
    response_model=AIInsightRead,
)
def get_ai_insight(
    insight_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> AIInsightRead:
    insight = db.scalar(
        select(AIInsight).where(
            AIInsight.id == insight_id,
            AIInsight.account_id == account.id,
        )
    )

    if insight is None:
        raise HTTPException(404, "AI insight not found.")

    return _serialize_insight(db, insight)