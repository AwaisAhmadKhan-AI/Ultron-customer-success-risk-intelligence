from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ContactCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    job_title: str | None = Field(default=None, max_length=150)

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_required_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Contact name cannot be blank.")
        return value

    @field_validator("email", "phone", "job_title")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class ContactUpdate(BaseModel):
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    job_title: str | None = Field(default=None, max_length=150)

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_required_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Contact name cannot be blank.")
        return value

    @field_validator("email", "phone", "job_title")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class ContactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    job_title: str | None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None


class ContactListResponse(BaseModel):
    items: list[ContactRead]
    total: int
    page: int
    page_size: int