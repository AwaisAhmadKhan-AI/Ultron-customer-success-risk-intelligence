from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4
from typing import TYPE_CHECKING
from pgvector.sqlalchemy import VECTOR
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.document import Document

if TYPE_CHECKING:
    from app.models.ai_insight_evidence import AIInsightEvidence


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    __table_args__ = (
        CheckConstraint(
            "chunk_index >= 0",
            name="ck_document_chunks_index_nonnegative",
        ),
        CheckConstraint(
            "length(trim(chunk_text)) > 0",
            name="ck_document_chunks_text_not_blank",
        ),
        UniqueConstraint(
            "document_id",
            "chunk_index",
            name="uq_document_chunks_document_chunk_index",
        ),
        UniqueConstraint(
            "account_id",
            "id",
            name="uq_document_chunks_account_id_id",
        ),
        ForeignKeyConstraint(
            ["account_id", "document_id"],
            ["documents.account_id", "documents.id"],
            name="fk_document_chunks_account_document",
            ondelete="RESTRICT",
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
        index=True,
    )

    document_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    chunk_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    chunk_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    embedding: Mapped[list[float] | None] = mapped_column(
        VECTOR(1024),
        nullable=True,
    )

    chunk_metadata: Mapped[dict | None] = mapped_column(
        "metadata",
        JSONB,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    document: Mapped[Document] = relationship(
        back_populates="chunks",
    )

    evidence: Mapped[list["AIInsightEvidence"]] = relationship(
        back_populates="document_chunk",
        viewonly=True,
    )