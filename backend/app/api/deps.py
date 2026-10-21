from typing import Annotated
from uuid import UUID

import jwt
from jwt.exceptions import InvalidTokenError

from fastapi import Depends, HTTPException, status
from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials,
)
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.account import Account
from app.models.account_assignment import AccountAssignment
from app.models.user import User


bearer_scheme = HTTPBearer(auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_error

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
            options={"require": ["exp", "sub"]},
        )

        user_id = UUID(payload["sub"])

    except (InvalidTokenError, ValueError, KeyError, TypeError):
        raise credentials_error

    user = db.get(User, user_id)

    if user is None or not user.is_active:
        raise credentials_error

    return user


def get_authorized_account(
    account_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Account:
    account = db.get(Account, account_id)

    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    assignment = db.get(
        AccountAssignment,
        (account_id, current_user.id),
    )

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this account",
        )

    return account