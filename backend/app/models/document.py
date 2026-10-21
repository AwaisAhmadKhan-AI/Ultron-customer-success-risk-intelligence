from __future__ import annotations
from typing import TYPE_CHECKING
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    CHAR,
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.account import Account
from app.models.enums import DocumentIngestionStatus
from app.models.user import User
if TYPE_CHECKING:
    from app.models.document_chunk import DocumentChunk

class Document(Base):
    __tablename__ = "documents"

    __table_args__ = (
        CheckConstraint(
            "length(trim(title)) > 0",
            name="ck_documents_title_not_blank",
        ),
        CheckConstraint(
            "length(trim(original_filename)) > 0",
            name="ck_documents_filename_not_blank",
        ),
        CheckConstraint(
            "length(trim(mime_type)) > 0",
            name="ck_documents_mime_type_not_blank",
        ),
        CheckConstraint(
            "size_bytes > 0",
            name="ck_documents_size_positive",
        ),
        CheckConstraint(
            "content_sha256 ~ '^[0-9a-f]{64}$'",
            name="ck_documents_sha256_format",
        ),
        CheckConstraint(
            "length(trim(storage_key)) > 0",
            name="ck_documents_storage_key_not_blank",
        ),
        CheckConstraint(
            "ingestion_status IN "
            "('uploaded', 'processing', 'ready', 'failed')",
            name="ck_documents_ingestion_status",
        ),
        UniqueConstraint(
            "account_id",
            "content_sha256",
            name="uq_documents_account_content_sha256",
        ),
        UniqueConstraint(
            "account_id",
            "id",
            name="uq_documents_account_id_id",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    account_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )

    uploaded_by_user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    mime_type: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    size_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    content_sha256: Mapped[str] = mapped_column(
        CHAR(64),
        nullable=False,
    )

    storage_key: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )



    ingestion_status: Mapped[DocumentIngestionStatus] = mapped_column(
        SAEnum(
            DocumentIngestionStatus,
            name="document_ingestion_status",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        default=DocumentIngestionStatus.UPLOADED,
        server_default=DocumentIngestionStatus.UPLOADED.value,
        nullable=False,
    )

    ingestion_error_code: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    account: Mapped[Account] = relationship(
        back_populates="documents",
    )

    uploaded_by: Mapped[User] = relationship(
        back_populates="uploaded_documents",
    )

    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document",
    )