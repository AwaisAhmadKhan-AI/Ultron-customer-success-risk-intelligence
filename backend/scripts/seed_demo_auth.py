from getpass import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.account import Account
from app.models.account_assignment import AccountAssignment
from app.models.enums import AccountStatus, UserRole
from app.models.user import User


DEMO_USERS = [
    {
        "email": "demo-csm-a@ultron.local",
        "name": "Demo CSM A",
        "account_name": "Demo Account A",
    },
    {
        "email": "demo-csm-b@ultron.local",
        "name": "Demo CSM B",
        "account_name": "Demo Account B",
    },
]


def get_new_password(email: str) -> str:
    while True:
        password = getpass(f"New password for {email}: ")
        confirmation = getpass("Confirm password: ")

        if password != confirmation:
            print("Passwords do not match. Try again.")
            continue

        if len(password) < 12:
            print("Use at least 12 characters.")
            continue

        return password


def main() -> None:
    with SessionLocal() as db:
        try:
            for item in DEMO_USERS:
                user = db.scalar(
                    select(User).where(User.email == item["email"])
                )

                if user is None:
                    user = User(
                        full_name=item["name"],
                        email=item["email"],
                        role=UserRole.CSM,
                        is_active=True,
                    )
                    db.add(user)
                    db.flush()
                    print(f"Created user: {item['email']}")
                elif user.role != UserRole.CSM:
                    raise ValueError(
                        f"{item['email']} exists but is not a CSM."
                    )

                if not user.is_active:
                    raise ValueError(
                        f"{item['email']} is inactive. "
                        "Do not activate it automatically."
                    )

                if not user.password_hash:
                    user.password_hash = hash_password(
                        get_new_password(item["email"])
                    )

                account = db.scalar(
                    select(Account).where(
                        Account.name == item["account_name"]
                    )
                )

                if account is None:
                    account = Account(
                        name=item["account_name"],
                        owner_user_id=user.id,
                        status=AccountStatus.ACTIVE,
                        is_archived=False,
                    )
                    db.add(account)
                    db.flush()
                elif account.owner_user_id != user.id:
                    raise ValueError(
                        f"{item['account_name']} already belongs "
                        "to another owner. Resolve this manually."
                    )

                assignment = db.get(
                    AccountAssignment,
                    (account.id, user.id),
                )

                if assignment is None:
                    db.add(
                        AccountAssignment(
                            account_id=account.id,
                            user_id=user.id,
                        )
                    )

            db.commit()
            print("\nDemo authentication data is ready.")
            print("CSM A is assigned Demo Account A.")
            print("CSM B is assigned Demo Account B.")
            print("The users are not assigned each other's accounts.")

        except Exception:
            db.rollback()
            raise


if __name__ == "__main__":
    main()