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
from app.models.interaction import Interaction
from app.models.user import User
from app.schemas.interaction import (
    InteractionCreate,
    InteractionListResponse,
    InteractionRead,
    InteractionUpdate,
)
from app.services import interaction_service


router = APIRouter(
    prefix="/accounts/{account_id}/interactions",
    tags=["Interactions"],
)


@router.post(
    "",
    response_model=InteractionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_interaction(
    payload: InteractionCreate,
    account: Annotated[Account, Depends(get_authorized_account)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Interaction:
    return interaction_service.create_interaction(
        db,
        account.id,
        current_user.id,
        payload,
    )


@router.get("", response_model=InteractionListResponse)
def list_interactions(
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
    include_archived: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> InteractionListResponse:
    items, total = interaction_service.list_interactions(
        db,
        account.id,
        include_archived=include_archived,
        offset=(page - 1) * page_size,
        limit=page_size,
    )
    return InteractionListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{interaction_id}", response_model=InteractionRead)
def get_interaction(
    interaction_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> Interaction:
    return interaction_service.get_interaction(
        db,
        account.id,
        interaction_id,
    )


@router.patch("/{interaction_id}", response_model=InteractionRead)
def patch_interaction(
    interaction_id: UUID,
    payload: InteractionUpdate,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> Interaction:
    interaction = interaction_service.get_interaction(
        db,
        account.id,
        interaction_id,
    )
    return interaction_service.update_interaction(
        db,
        interaction,
        payload,
    )


@router.post(
    "/{interaction_id}/archive",
    response_model=InteractionRead,
)
def archive_interaction(
    interaction_id: UUID,
    account: Annotated[Account, Depends(get_authorized_account)],
    db: Annotated[Session, Depends(get_db)],
) -> Interaction:
    interaction = interaction_service.get_interaction(
        db,
        account.id,
        interaction_id,
    )
    return interaction_service.archive_interaction(db, interaction)