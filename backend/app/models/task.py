from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

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
from app.models.contact import Contact
from app.models.enums import TaskPriority, TaskStatus
from app.models.user import User


class Task(Base):
    __tablename__ = "tasks"

    __table_args__ = (
        CheckConstraint(
            "length(trim(title)) > 0",
            name="ck_tasks_title_not_blank",
        ),
        CheckConstraint(
            "status IN ('open', 'in_progress', 'completed', 'cancelled')",
            name="ck_tasks_status",
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'urgent')",
            name="ck_tasks_priority",
        ),
        CheckConstraint(
            "(status = 'completed' AND completed_at IS NOT NULL) OR "
            "(status <> 'completed' AND completed_at IS NULL)",
            name="ck_tasks_completion_timestamp_consistent",
        ),
        ForeignKeyConstraint(
            ["account_id", "contact_id"],
            ["contacts.account_id", "contacts.id"],
            name="fk_tasks_account_contact",
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

    contact_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    assigned_to_user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    created_by_user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(
            TaskStatus,
            name="task_status",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        default=TaskStatus.OPEN,
        server_default=TaskStatus.OPEN.value,
        nullable=False,
    )

    priority: Mapped[TaskPriority] = mapped_column(
        SAEnum(
            TaskPriority,
            name="task_priority",
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_cls: [
                item.value for item in enum_cls
            ],
        ),
        default=TaskPriority.MEDIUM,
        server_default=TaskPriority.MEDIUM.value,
        nullable=False,
    )

    due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
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
        back_populates="tasks",
    )

    contact: Mapped[Contact | None] = relationship(
        primaryjoin=lambda: and_(
            Contact.account_id == Task.account_id,
            Contact.id == foreign(Task.contact_id),
        ),
    )

    assignee: Mapped[User] = relationship(
        back_populates="assigned_tasks",
        foreign_keys=[assigned_to_user_id],
    )

    created_by: Mapped[User] = relationship(
        back_populates="created_tasks",
        foreign_keys=[created_by_user_id],
    )