from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

password_hasher = PasswordHash.recommended()

# Unknown email par bhi password verification ka work perform hota hai.
DUMMY_PASSWORD_HASH = password_hasher.hash(
    "ultron-dummy-password-not-a-real-account"
)


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return password_hasher.verify(password, hashed_password)
    except Exception:
        # Invalid/corrupt stored hashes must not crash login.
        return False


def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload = {
        "sub": user_id,
        "iat": now,
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )