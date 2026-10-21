from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.account import Account
from app.models.enums import AIInsightConfidence, AIInsightStatus, RiskLevel
from app.models.user import User
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.ai_insight_evidence import AIInsightEvidence


class AIInsight(Base):
    __tablename__ = "ai_insights"

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'completed', 'failed')",
            name="ck_ai_insights_status",
        ),
        CheckConstraint(
            "suggested_risk_level IS NULL OR "
            "suggested_risk_level IN ('low', 'medium', 'high', 'critical')",
            name="ck_ai_insights_suggested_risk_level",
        ),
        CheckConstraint(
            "confidence IS NULL OR confidence IN ('low', 'medium', 'high')",
            name="ck_ai_insights_confidence",
        ),
        CheckConstraint(
            "summary IS NULL OR length(trim(summary)) > 0",
            name="ck_ai_insights_summary_not_blank",
        ),
        CheckConstraint(
            "error_code IS NULL OR length(trim(error_code)) > 0",
            name="ck_ai_insights_error_code_not_blank",
        ),
        CheckConstraint(
            "risk_factors IS NULL OR "
            "jsonb_typeof(risk_factors) = 'array'",
            name="ck_ai_insights_risk_factors_array",
        ),
        CheckConstraint(
            "recommended_actions IS NULL OR "
            "jsonb_typeof(recommended_actions) = 'array'",
            name="ck_ai_insights_recommended_actions_array",
        ),
        CheckConstraint(
            "(status = 'completed' AND completed_at IS NOT NULL "
            "AND summary IS NOT NULL AND length(trim(summary)) > 0 "
            "AND error_code IS NULL) "
            "OR "
            "(status = 'failed' AND completed_at IS NOT NULL "
            "AND error_code IS NOT NULL "
            "AND length(trim(error_code)) > 0) "
            "OR "
            "(status = 'pending' AND completed_at IS NULL "
            "AND error_code IS NULL)",
            name="ck_ai_insights_status_consistent",
        ),
        UniqueConstraint(
            "account_id",
            "id",
            name="uq_ai_insights_account_id_id",
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

    requested_by_user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    status: Mapped[AIInsightStatus] = mapped_column(
        SAEnum(
            AIInsightStatus,
            name="ai_insight_status",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        default=AIInsightStatus.PENDING,
        server_default=AIInsightStatus.PENDING.value,
        nullable=False,
    )

    suggested_risk_level: Mapped[RiskLevel | None] = mapped_column(
        SAEnum(
            RiskLevel,
            name="ai_suggested_risk_level",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        nullable=True,
    )

    summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    risk_factors: Mapped[list | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    recommended_actions: Mapped[list | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    confidence: Mapped[AIInsightConfidence | None] = mapped_column(
        SAEnum(
            AIInsightConfidence,
            name="ai_insight_confidence",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        nullable=True,
    )

    model_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    prompt_version: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    error_code: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    account: Mapped[Account] = relationship(
        back_populates="ai_insights",
    )

    requested_by: Mapped[User] = relationship(
        back_populates="requested_ai_insights",
        foreign_keys=[requested_by_user_id],
    )

    evidence: Mapped[list["AIInsightEvidence"]] = relationship(
        back_populates="ai_insight",
        viewonly=True,
    )