from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import DocumentIngestionStatus


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID
    uploaded_by_user_id: UUID
    title: str
    original_filename: str
    mime_type: str
    size_bytes: int
    content_sha256: str
    ingestion_status: DocumentIngestionStatus
    ingestion_error_code: str | None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None


class DocumentListResponse(BaseModel):
    items: list[DocumentRead]
    total: int