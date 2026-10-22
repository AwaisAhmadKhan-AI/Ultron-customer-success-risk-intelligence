from __future__ import annotations

from getpass import getpass
from pathlib import Path
import sys

# Allow this script to be run as: python scripts/create_admin.py from backend/.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import func, select  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.enums import UserRole  # noqa: E402
from app.models.user import User  # noqa: E402


def main() -> int:
    print("Ultron first-admin bootstrap")
    print("Creates a local administrator account; it does not expose a public registration route.")

    with SessionLocal() as db:
        existing_admin = db.scalar(
            select(User.id).where(User.role == UserRole.ADMIN_MANAGER).limit(1)
        )
        if existing_admin is not None:
            print("An admin_manager already exists. No changes made.")
            return 1

        full_name = input("Administrator full name: ").strip()
        email = input("Administrator email: ").strip().lower()
        if not full_name or len(full_name) > 150:
            print("Full name is required and must be at most 150 characters.")
            return 2
        if (
            len(email) > 320
            or email.count("@") != 1
            or any(character.isspace() for character in email)
        ):
            print("Enter a valid email address.")
            return 2
        local_part, domain = email.split("@", 1)
        if (
            not local_part
            or "." not in domain
            or domain.startswith(".")
            or domain.endswith(".")
        ):
            print("Enter a valid email address.")
            return 2

        existing_email = db.scalar(
            select(User.id).where(func.lower(User.email) == email)
        )
        if existing_email is not None:
            print("That email already belongs to a user. No changes made.")
            return 2

        password = getpass("Admin password (minimum 12 characters; hidden): ")
        confirmation = getpass("Confirm admin password: ")
        if len(password) < 12 or len(password) > 128:
            print("Password must contain 12–128 characters.")
            return 2
        if password != confirmation:
            print("Passwords do not match. No changes made.")
            return 2

        admin = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role=UserRole.ADMIN_MANAGER,
            is_active=True,
        )
        db.add(admin)
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
        print(f"Administrator created successfully: {email}")
        print("For security, this script will not display or store the password.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
