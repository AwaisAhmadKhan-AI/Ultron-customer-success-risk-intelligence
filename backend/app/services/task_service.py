from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.contact import Contact
from app.models.enums import TaskStatus
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


def validate_contact(
    db: Session,
    account_id: UUID,
    contact_id: UUID | None,
) -> None:
    if contact_id is None:
        return

    contact = db.scalar(
        select(Contact.id).where(
            Contact.id == contact_id,
            Contact.account_id == account_id,
            Contact.archived_at.is_(None),
        )
    )

    if contact is None:
        raise HTTPException(
            422,
            "Contact must be active and belong to this account.",
        )


def list_tasks(
    db: Session,
    account_id: UUID,
    *,
    include_cancelled: bool,
    offset: int,
    limit: int,
) -> tuple[list[Task], int]:
    filters = [Task.account_id == account_id]

    if not include_cancelled:
        filters.append(Task.status != TaskStatus.CANCELLED)

    total = db.scalar(
        select(func.count(Task.id)).where(*filters)
    ) or 0

    items = list(
        db.scalars(
            select(Task)
            .where(*filters)
            .order_by(Task.created_at.desc())
            .offset(offset)
            .limit(limit)
        ).all()
    )

    return items, total


def get_task(
    db: Session,
    account_id: UUID,
    task_id: UUID,
) -> Task:
    task = db.scalar(
        select(Task).where(
            Task.id == task_id,
            Task.account_id == account_id,
        )
    )

    if task is None:
        raise HTTPException(404, "Task not found.")

    return task


def create_task(
    db: Session,
    account_id: UUID,
    user_id: UUID,
    payload: TaskCreate,
) -> Task:
    validate_contact(db, account_id, payload.contact_id)

    task = Task(
        account_id=account_id,
        assigned_to_user_id=user_id,
        created_by_user_id=user_id,
        **payload.model_dump(),
    )

    db.add(task)

    try:
        db.commit()
        db.refresh(task)
        return task
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Task could not be created.") from exc


def update_task(
    db: Session,
    task: Task,
    payload: TaskUpdate,
) -> Task:
    if task.status in (TaskStatus.COMPLETED, TaskStatus.CANCELLED):
        raise HTTPException(
            409,
            "Completed or cancelled tasks cannot be edited.",
        )

    changes = payload.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(422, "Provide at least one field to update.")

    for field in ("title", "priority"):
        if field in changes and changes[field] is None:
            raise HTTPException(422, f"{field} cannot be null.")

    if "contact_id" in changes:
        validate_contact(db, task.account_id, changes["contact_id"])

    for field, value in changes.items():
        setattr(task, field, value)

    try:
        db.commit()
        db.refresh(task)
        return task
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Task update failed.") from exc


def complete_task(db: Session, task: Task) -> Task:
    if task.status == TaskStatus.CANCELLED:
        raise HTTPException(409, "Cancelled tasks cannot be completed.")

    if task.status != TaskStatus.COMPLETED:
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.now(timezone.utc)

        try:
            db.commit()
            db.refresh(task)
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(409, "Task completion failed.") from exc

    return task


def cancel_task(db: Session, task: Task) -> Task:
    if task.status == TaskStatus.COMPLETED:
        raise HTTPException(409, "Completed tasks cannot be cancelled.")

    if task.status != TaskStatus.CANCELLED:
        task.status = TaskStatus.CANCELLED
        task.completed_at = None

        try:
            db.commit()
            db.refresh(task)
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(409, "Task cancellation failed.") from exc

    return task