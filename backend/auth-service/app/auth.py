from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.config import get_settings
from app.models import TokenPayload

settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt. Truncates to 72 bytes max."""
    # bcrypt has a 72-byte limit
    truncated = password[:72] if len(password.encode('utf-8')) > 72 else password
    return pwd_context.hash(truncated)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    truncated = plain_password[:72] if len(plain_password.encode('utf-8')) > 72 else plain_password
    return pwd_context.verify(truncated, hashed_password)


def create_access_token(username: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)

    payload = {
        "sub": username,
        "role": role,
        "exp": expire,
        "iat": datetime.utcnow()
    }

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[TokenPayload]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )

        return TokenPayload(
            sub=payload.get("sub"),
            role=payload.get("role"),
            exp=datetime.fromtimestamp(payload.get("exp"))
        )

    except JWTError:
        return None


def is_token_expired(token_payload: TokenPayload) -> bool:
    """Check if token is expired."""
    return datetime.utcnow() > token_payload.exp
