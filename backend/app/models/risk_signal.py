from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4
from app.models.document import Document
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    ForeignKeyConstraint,
    String,
    Text,
    and_,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship

from app.db.base import Base
from app.models.account import Account
from app.models.enums import (
    RiskSignalOrigin,
    RiskSignalSeverity,
    RiskSignalStatus,
    RiskSignalType,
)
from app.models.interaction import Interaction
from app.models.user import User


class RiskSignal(Base):
    __tablename__ = "risk_signals"

    __table_args__ = (
        CheckConstraint(
            "length(trim(title)) > 0",
            name="ck_risk_signals_title_not_blank",
        ),
        CheckConstraint(
            "length(trim(description)) > 0",
            name="ck_risk_signals_description_not_blank",
        ),
        CheckConstraint(
            "severity IN ('low', 'medium', 'high', 'critical')",
            name="ck_risk_signals_severity",
        ),
        CheckConstraint(
            "status IN ('active', 'acknowledged', 'resolved', 'dismissed')",
            name="ck_risk_signals_status",
        ),
        CheckConstraint(
            "signal_type IN ("
            "'renewal_risk', 'low_engagement', "
            "'support_escalation', 'negative_feedback', 'other')",
            name="ck_risk_signals_type",
        ),
        CheckConstraint(
            "origin IN ('manual', 'rule')",
            name="ck_risk_signals_origin",
        ),
        CheckConstraint(
            "origin = 'rule' OR created_by_user_id IS NOT NULL",
            name="ck_risk_signals_manual_creator_required",
        ),
        CheckConstraint(
            "status <> 'dismissed' OR "
            "(dismissed_reason IS NOT NULL "
            "AND length(trim(dismissed_reason)) > 0)",
            name="ck_risk_signals_dismissal_reason_required",
        ),
        ForeignKeyConstraint(
            ["account_id", "source_interaction_id"],
            ["interactions.account_id", "interactions.id"],
            name="fk_risk_signals_account_interaction",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["account_id", "source_document_id"],
            ["documents.account_id", "documents.id"],
            name="fk_risk_signals_account_document",
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

    source_interaction_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    source_document_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    created_by_user_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    signal_type: Mapped[RiskSignalType] = mapped_column(
        SAEnum(
            RiskSignalType,
            name="risk_signal_type",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        nullable=False,
    )

    severity: Mapped[RiskSignalSeverity] = mapped_column(
        SAEnum(
            RiskSignalSeverity,
            name="risk_signal_severity",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        nullable=False,
    )

    status: Mapped[RiskSignalStatus] = mapped_column(
        SAEnum(
            RiskSignalStatus,
            name="risk_signal_status",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        default=RiskSignalStatus.ACTIVE,
        server_default=RiskSignalStatus.ACTIVE.value,
        nullable=False,
    )

    origin: Mapped[RiskSignalOrigin] = mapped_column(
        SAEnum(
            RiskSignalOrigin,
            name="risk_signal_origin",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=False,
    )

    source_description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    rule_code: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    dismissed_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    acknowledged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    dismissed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
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

    account: Mapped[Account] = relationship(
        back_populates="risk_signals",
    )

    source_interaction: Mapped[Interaction | None] = relationship(
        primaryjoin=lambda: and_(
            Interaction.account_id == RiskSignal.account_id,
            Interaction.id == foreign(RiskSignal.source_interaction_id),
        ),
    )

    source_document: Mapped[Document | None] = relationship(
        primaryjoin=lambda: and_(
            Document.account_id == RiskSignal.account_id,
            Document.id == foreign(RiskSignal.source_document_id),
        ),
    )

    created_by: Mapped[User | None] = relationship(
        foreign_keys=[created_by_user_id],
    )