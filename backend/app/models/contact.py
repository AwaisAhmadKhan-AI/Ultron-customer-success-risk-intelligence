from __future__ import annotations
from typing import TYPE_CHECKING
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
if TYPE_CHECKING:
    from app.models.account import Account

class Contact(Base):
    __tablename__ = "contacts"

    __table_args__ = (
    CheckConstraint(
        "length(trim(first_name)) > 0",
        name="ck_contacts_first_name_not_blank",
    ),
    CheckConstraint(
        "length(trim(last_name)) > 0",
        name="ck_contacts_last_name_not_blank",
    ),
    UniqueConstraint(
        "account_id",
        "id",
        name="uq_contacts_account_id_id",
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

    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    email: Mapped[str | None] = mapped_column(
        String(320),
        nullable=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    job_title: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    account: Mapped["Account"] = relationship(
        back_populates="contacts",
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