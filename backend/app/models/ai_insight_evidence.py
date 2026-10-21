from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKeyConstraint,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.ai_insight import AIInsight
from app.models.document_chunk import DocumentChunk
from app.models.interaction import Interaction


class AIInsightEvidence(Base):
    __tablename__ = "ai_insight_evidence"

    __table_args__ = (
        CheckConstraint(
            """
            (
                document_chunk_id IS NOT NULL
                AND interaction_id IS NULL
            )
            OR
            (
                document_chunk_id IS NULL
                AND interaction_id IS NOT NULL
            )
            """,
            name="ck_ai_insight_evidence_exactly_one_source",
        ),
        CheckConstraint(
            "length(trim(excerpt)) > 0",
            name="ck_ai_insight_evidence_excerpt_not_blank",
        ),
        CheckConstraint(
            "claim_supported IS NULL OR "
            "length(trim(claim_supported)) > 0",
            name="ck_ai_insight_evidence_claim_not_blank",
        ),
        CheckConstraint(
            "citation_order >= 1",
            name="ck_ai_insight_evidence_order_positive",
        ),
        UniqueConstraint(
            "account_id",
            "ai_insight_id",
            "citation_order",
            name="uq_ai_insight_evidence_citation_order",
        ),
        ForeignKeyConstraint(
            ["account_id", "ai_insight_id"],
            ["ai_insights.account_id", "ai_insights.id"],
            name="fk_ai_insight_evidence_account_insight",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["account_id", "document_chunk_id"],
            ["document_chunks.account_id", "document_chunks.id"],
            name="fk_ai_insight_evidence_account_chunk",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["account_id", "interaction_id"],
            ["interactions.account_id", "interactions.id"],
            name="fk_ai_insight_evidence_account_interaction",
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
        nullable=False,
        index=True,
    )

    ai_insight_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    document_chunk_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    interaction_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    excerpt: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    claim_supported: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    citation_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    ai_insight: Mapped[AIInsight] = relationship(
        back_populates="evidence",
        viewonly=True,
    )

    document_chunk: Mapped[DocumentChunk | None] = relationship(
        back_populates="evidence",
        viewonly=True,
    )

    interaction: Mapped[Interaction | None] = relationship(
        back_populates="ai_insight_evidence",
        viewonly=True,
    )