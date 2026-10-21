from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import RiskSignalSeverity, RiskSignalStatus, RiskSignalType


class RiskSignalCreate(BaseModel):
    signal_type: RiskSignalType
    severity: RiskSignalSeverity
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    source_interaction_id: UUID | None = None
    source_document_id: UUID | None = None
    source_description: str | None = None

    @field_validator("title", "description")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("source_description")
    @classmethod
    def normalize_source_description(
        cls,
        value: str | None,
    ) -> str | None:
        return value.strip() or None if value is not None else None


class RiskSignalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID
    source_interaction_id: UUID | None
    source_document_id: UUID | None
    created_by_user_id: UUID | None
    signal_type: RiskSignalType
    severity: RiskSignalSeverity
    status: RiskSignalStatus
    title: str
    description: str
    source_description: str | None
    rule_code: str | None
    dismissed_reason: str | None
    acknowledged_at: datetime | None
    resolved_at: datetime | None
    dismissed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class RiskSignalListResponse(BaseModel):
    items: list[RiskSignalRead]
    total: int
    page: int
    page_size: int


class RiskSignalDismiss(BaseModel):
    reason: str = Field(min_length=1, max_length=2000)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Dismissal reason cannot be blank.")
        return value