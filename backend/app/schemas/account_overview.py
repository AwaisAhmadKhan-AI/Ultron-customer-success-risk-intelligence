from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.account import AccountRead
from app.schemas.contact import ContactRead
from app.schemas.interaction import InteractionRead
from app.schemas.task import TaskRead
from app.schemas.risk_signal import RiskSignalRead
from app.schemas.document import DocumentRead
from app.models.enums import AIInsightConfidence, AIInsightStatus, RiskLevel


class AIInsightSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID
    status: AIInsightStatus
    suggested_risk_level: RiskLevel | None
    summary: str | None
    confidence: AIInsightConfidence | None
    created_at: datetime
    completed_at: datetime | None
    error_code: str | None


class AccountOverviewResponse(BaseModel):
    account: AccountRead
    contacts: list[ContactRead]
    recent_interactions: list[InteractionRead]
    open_tasks: list[TaskRead]
    risk_signals: list[RiskSignalRead]
    documents: list[DocumentRead]
    recent_ai_insights: list[AIInsightSummaryRead]