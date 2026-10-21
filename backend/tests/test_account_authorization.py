from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.api.deps import get_authorized_account
from app.models.account import Account
from app.models.account_assignment import AccountAssignment


ACCOUNT_ID = UUID("00000000-0000-0000-0000-000000000100")
CSM_A_ID = UUID("00000000-0000-0000-0000-000000000001")
CSM_B_ID = UUID("00000000-0000-0000-0000-000000000002")


class FakeDB:
    """Minimal fake DB to test account authorization without PostgreSQL."""

    def __init__(self, account_exists=True, assigned_pairs=None):
        self.account = (
            SimpleNamespace(id=ACCOUNT_ID)
            if account_exists
            else None
        )
        self.assigned_pairs = set(assigned_pairs or [])
        self.calls = []

    def get(self, model, key):
        self.calls.append((model, key))

        if model is Account:
            if self.account is not None and key == self.account.id:
                return self.account
            return None

        if model is AccountAssignment:
            if tuple(key) in self.assigned_pairs:
                return SimpleNamespace(
                    account_id=key[0],
                    user_id=key[1],
                )
            return None

        return None


def test_assigned_csm_can_access_account():
    db = FakeDB(
        assigned_pairs={(ACCOUNT_ID, CSM_A_ID)},
    )
    current_user = SimpleNamespace(id=CSM_A_ID)

    account = get_authorized_account(
        account_id=ACCOUNT_ID,
        db=db,
        current_user=current_user,
    )

    assert account is db.account


def test_unassigned_csm_gets_403():
    db = FakeDB(
        assigned_pairs={(ACCOUNT_ID, CSM_B_ID)},
    )
    current_user = SimpleNamespace(id=CSM_A_ID)

    with pytest.raises(HTTPException) as exc_info:
        get_authorized_account(
            account_id=ACCOUNT_ID,
            db=db,
            current_user=current_user,
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == (
        "You are not authorized to access this account"
    )


def test_nonexistent_account_returns_404():
    db = FakeDB(account_exists=False)
    current_user = SimpleNamespace(id=CSM_A_ID)

    with pytest.raises(HTTPException) as exc_info:
        get_authorized_account(
            account_id=ACCOUNT_ID,
            db=db,
            current_user=current_user,
        )

    assert exc_info.value.status_code == 404

    # If the account doesn't exist, assignment lookup should not happen.
    assert all(model is not AccountAssignment for model, _ in db.calls)