from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.admin_user import AdminUserCreate
from app.schemas.auth import UserResponse


router = APIRouter(prefix="/admin/users", tags=["Administration"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_csm_user(
    payload: AdminUserCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Create a CSM account. Only an authenticated admin_manager may call this."""
    if current_user.role != UserRole.ADMIN_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required",
        )

    existing_user = db.scalar(
        select(User.id).where(func.lower(User.email) == payload.email)
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password.get_secret_value()),
        role=UserRole.CSM,
        is_active=True,
    )
    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        ) from exc

    return user
