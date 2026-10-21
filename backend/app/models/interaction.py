from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    UniqueConstraint,
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
from app.models.contact import Contact
from app.models.enums import InteractionType
from app.models.user import User
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.ai_insight_evidence import AIInsightEvidence



class Interaction(Base):
    __tablename__ = "interactions"

    __table_args__ = (
        CheckConstraint(
            "interaction_type IN ('call', 'email', 'meeting', 'note')",
            name="ck_interactions_type",
        ),
        CheckConstraint(
            "subject IS NULL OR length(trim(subject)) > 0",
            name="ck_interactions_subject_not_blank",
        ),
        CheckConstraint(
            "length(trim(summary)) > 0",
            name="ck_interactions_summary_not_blank",
        ),
        ForeignKeyConstraint(
            ["account_id", "contact_id"],
            ["contacts.account_id", "contacts.id"],
            name="fk_interactions_account_contact",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "account_id",
            "id",
            name="uq_interactions_account_id_id",
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

    contact_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    created_by_user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    interaction_type: Mapped[InteractionType] = mapped_column(
        SAEnum(
            InteractionType,
            name="interaction_type",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        nullable=False,
    )

    subject: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
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

    account: Mapped[Account] = relationship(
        back_populates="interactions",
    )

    contact: Mapped[Contact | None] = relationship(
        primaryjoin=lambda: and_(
            Contact.account_id == Interaction.account_id,
            Contact.id == foreign(Interaction.contact_id),
        ),
    )

    created_by: Mapped[User] = relationship(
        foreign_keys=[created_by_user_id],
    )

    ai_insight_evidence: Mapped[list["AIInsightEvidence"]] = relationship(
        back_populates="interaction",
        viewonly=True,
    )

    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
)