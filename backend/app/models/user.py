from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum as SAEnum
from sqlalchemy import String, func, text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.enums import UserRole

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.ai_insight import AIInsight
    from app.models.account_assignment import AccountAssignment

class User(Base):
    __tablename__ = "users"

    __table_args__ = (
    CheckConstraint(
        "role IN ('csm', 'admin_manager')",
        name="ck_users_role",
    ),
)

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    email: Mapped[str] = mapped_column(
        String(320),
        unique=True,
        index=True,
        nullable=False,
    )

    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    uploaded_documents: Mapped[list["Document"]] = relationship(
    back_populates="uploaded_by",
    )

    requested_ai_insights: Mapped[list["AIInsight"]] = relationship(
    back_populates="requested_by",
    foreign_keys="AIInsight.requested_by_user_id",
    )

    account_assignments: Mapped[list["AccountAssignment"]] = relationship(
    back_populates="user",
    foreign_keys="AccountAssignment.user_id",
    )

    created_account_assignments: Mapped[list["AccountAssignment"]] = relationship(
    back_populates="assigned_by",
    foreign_keys="AccountAssignment.assigned_by_user_id",
    )

    role: Mapped[UserRole] = mapped_column(
        SAEnum(
            UserRole,
            name="user_role",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        default=UserRole.CSM,
        server_default=UserRole.CSM.value,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
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

    password_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
        nullable=False,
    )

    owned_accounts: Mapped[list["Account"]] = relationship(
        back_populates="owner",
    )

    assigned_tasks: Mapped[list["Task"]] = relationship(
    back_populates="assignee",
    foreign_keys="Task.assigned_to_user_id",
    )

    created_tasks: Mapped[list["Task"]] = relationship(
    back_populates="created_by",
    foreign_keys="Task.created_by_user_id",
    )