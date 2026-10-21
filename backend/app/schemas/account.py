from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AccountStatus, RiskLevel


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    status: AccountStatus = AccountStatus.ACTIVE
    risk_level: RiskLevel | None = None
    renewal_date: date | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Account name must not be blank.")
        return value


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    status: AccountStatus | None = None
    risk_level: RiskLevel | None = None
    renewal_date: date | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return value

        value = value.strip()
        if not value:
            raise ValueError("Account name must not be blank.")
        return value


class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    owner_user_id: UUID
    status: AccountStatus
    risk_level: RiskLevel | None
    renewal_date: date | None
    is_archived: bool
    created_at: datetime
    updated_at: datetime


class AccountListResponse(BaseModel):
    items: list[AccountRead]
    total: int
    page: int
    page_size: int