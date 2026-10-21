from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import (
    get_authorized_account,
    get_current_user,
    get_db,
)
from app.models.account import Account
from app.models.task import Task
from app.models.user import User
from app.schemas.task import (
    TaskCreate,
    TaskListResponse,
    TaskRead,
    TaskUpdate,
)
from app.services import task_service


router = APIRouter(
    prefix="/accounts/{account_id}/tasks",
    tags=["Tasks"],
)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    account: Annotated[Account, Depends(get_authorized_account)],
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Task:
    return task_service.create_task(db, account.id, user.id, payload)


@router.get("", response_model=TaskListResponse)
def list_tasks(
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
    include_cancelled: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> TaskListResponse:
    items, total = task_service.list_tasks(
        db,
        account.id,
        include_cancelled=include_cancelled,
        offset=(page - 1) * page_size,
        limit=page_size,
    )
    return TaskListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> Task:
    return task_service.get_task(db, account.id, task_id)


@router.patch("/{task_id}", response_model=TaskRead)
def patch_task(
    task_id: UUID,
    payload: TaskUpdate,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> Task:
    task = task_service.get_task(db, account.id, task_id)
    return task_service.update_task(db, task, payload)


@router.post("/{task_id}/complete", response_model=TaskRead)
def mark_task_complete(
    task_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> Task:
    task = task_service.get_task(db, account.id, task_id)
    return task_service.complete_task(db, task)


@router.post("/{task_id}/cancel", response_model=TaskRead)
def mark_task_cancelled(
    task_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> Task:
    task = task_service.get_task(db, account.id, task_id)
    return task_service.cancel_task(db, task)