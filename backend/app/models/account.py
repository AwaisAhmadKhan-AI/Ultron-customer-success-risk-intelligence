from __future__ import annotations
from typing import TYPE_CHECKING
from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    UniqueConstraint,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AccountStatus, RiskLevel

if TYPE_CHECKING:
    from app.models.contact import Contact
    from app.models.interaction import Interaction
    from app.models.risk_signal import RiskSignal
    from app.models.task import Task
    from app.models.user import User
    from app.models.document import Document
    from app.models.ai_insight import AIInsight
    from app.models.account_assignment import AccountAssignment

class Account(Base):
    __tablename__ = "accounts"

    __table_args__ = (
    CheckConstraint(
        "status IN ('active', 'at_risk', 'renewal_pending', 'churned')",
        name="ck_accounts_status",
    ),
    CheckConstraint(
        "risk_level IS NULL OR risk_level IN "
        "('low', 'medium', 'high', 'critical')",
        name="ck_accounts_risk_level",
    ),
)

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True,
    )

    owner_user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    owner: Mapped["User"] = relationship(
        back_populates="owned_accounts",
    )

    contacts: Mapped[list["Contact"]] = relationship(
        back_populates="account",
    )

    interactions: Mapped[list["Interaction"]] = relationship(
    back_populates="account",
    )

    tasks: Mapped[list["Task"]] = relationship(
    back_populates="account",
    )

    risk_signals: Mapped[list["RiskSignal"]] = relationship(
    back_populates="account",
    )

    documents: Mapped[list["Document"]] = relationship(
    back_populates="account",
    )

    ai_insights: Mapped[list["AIInsight"]] = relationship(
    back_populates="account",
    )

    account_assignments: Mapped[list["AccountAssignment"]] = relationship(
    back_populates="account",
    )


    status: Mapped[AccountStatus] = mapped_column(
        SAEnum(
            AccountStatus,
            name="account_status",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        default=AccountStatus.ACTIVE,
        server_default=AccountStatus.ACTIVE.value,
        nullable=False,
    )

    risk_level: Mapped[RiskLevel | None] = mapped_column(
        SAEnum(
            RiskLevel,
            name="risk_level",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        nullable=True,
    )

    renewal_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
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