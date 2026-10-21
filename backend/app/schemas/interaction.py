from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import InteractionType


class InteractionCreate(BaseModel):
    contact_id: UUID | None = None
    interaction_type: InteractionType
    subject: str | None = Field(default=None, max_length=200)
    summary: str = Field(min_length=1, max_length=10000)
    occurred_at: datetime

    @field_validator("subject")
    @classmethod
    def normalize_subject(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None

    @field_validator("summary")
    @classmethod
    def validate_summary(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Interaction summary cannot be blank.")
        return value


class InteractionUpdate(BaseModel):
    contact_id: UUID | None = None
    interaction_type: InteractionType | None = None
    subject: str | None = Field(default=None, max_length=200)
    summary: str | None = Field(default=None, max_length=10000)
    occurred_at: datetime | None = None

    @field_validator("subject")
    @classmethod
    def normalize_subject(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None

    @field_validator("summary")
    @classmethod
    def validate_summary(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Interaction summary cannot be blank.")
        return value


class InteractionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID
    contact_id: UUID | None
    created_by_user_id: UUID
    interaction_type: InteractionType
    subject: str | None
    summary: str
    occurred_at: datetime
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None


class InteractionListResponse(BaseModel):
    items: list[InteractionRead]
    total: int
    page: int
    page_size: int