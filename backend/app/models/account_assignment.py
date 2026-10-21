from __future__ import annotations

from datetime import datetime
from uuid import UUID
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.account import Account
from app.models.user import User


class AccountAssignment(Base):
    __tablename__ = "account_assignments"

    __table_args__ = (
        Index("ix_account_assignments_user_id", "user_id"),
    )

    account_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        primary_key=True,
    )

    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        primary_key=True,
    )

    assigned_by_user_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    account: Mapped[Account] = relationship(
        back_populates="account_assignments",
    )

    user: Mapped[User] = relationship(
        back_populates="account_assignments",
        foreign_keys=[user_id],
    )

    assigned_by: Mapped[User | None] = relationship(
        back_populates="created_account_assignments",
        foreign_keys=[assigned_by_user_id],
    )