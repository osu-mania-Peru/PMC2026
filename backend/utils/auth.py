"""
Authentication utilities for JWT token management and API key validation
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Optional, Dict, Any

import jwt
from fastapi import HTTPException, Depends, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from config import Config
from models.user import User
from utils.database import get_db

if TYPE_CHECKING:
    from models.api_key import APIKey

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


def create_access_token(data: Dict[str, Any]) -> str:
    """
    Create a JWT access token.

    Args:
        data: Claims to encode. Must include ``user_id``.

    Returns:
        Encoded JWT string valid for ``Config.JWT_EXPIRATION_DAYS``.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=Config.JWT_EXPIRATION_DAYS)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        Config.SECRET_KEY,
        algorithm=Config.JWT_ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a JWT access token.

    Args:
        token: JWT string to decode.

    Returns:
        Token payload dict if valid, ``None`` if expired or invalid.
    """
    try:
        payload = jwt.decode(
            token,
            Config.SECRET_KEY,
            algorithms=[Config.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.exceptions.PyJWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to get the current authenticated user.

    Args:
        credentials: Bearer token from Authorization header.
        db: Database session.

    Returns:
        The authenticated :class:`~models.user.User` object.

    Raises:
        HTTPException: 401 if token is invalid, expired, or user not found.
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user


async def get_current_staff_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    FastAPI dependency to get current user with staff privileges.

    Args:
        current_user: Authenticated user from :func:`get_current_user`.

    Returns:
        The authenticated staff :class:`~models.user.User`.

    Raises:
        HTTPException: 403 if user is not staff.
    """
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff privileges required"
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    FastAPI dependency to optionally get authenticated user.

    Args:
        credentials: Optional bearer token.
        db: Database session.

    Returns:
        :class:`~models.user.User` if authenticated, ``None`` otherwise.
    """
    if credentials is None:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


def generate_api_key() -> tuple[str, str]:
    """
    Generate a new API key pair.

    Returns:
        Tuple of (raw_key, hashed_key). Raw key has ``pmc_`` prefix.
    """
    raw_key = f"pmc_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    return raw_key, key_hash


def hash_api_key(key: str) -> str:
    """
    Hash an API key using SHA-256.

    Args:
        key: Raw API key string.

    Returns:
        Hexadecimal SHA-256 hash.
    """
    return hashlib.sha256(key.encode()).hexdigest()


async def validate_api_key(x_api_key: str, db: Session) -> APIKey:
    """
    Validate an API key and update last_used_at.

    Args:
        x_api_key: Raw API key from X-API-Key header.
        db: Database session.

    Returns:
        :class:`~models.api_key.APIKey` object if valid.

    Raises:
        HTTPException: 401 if key is invalid or expired.
    """
    from models.api_key import APIKey

    key_hash = hash_api_key(x_api_key)
    api_key = db.query(APIKey).filter(
        APIKey.key_hash == key_hash,
        APIKey.is_active.is_(True)
    ).first()

    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )

    if api_key.expires_at and api_key.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key has expired"
        )

    api_key.last_used_at = datetime.utcnow()
    db.commit()

    return api_key


async def get_user_or_api_key(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User | APIKey:
    """
    FastAPI dependency accepting JWT token or API key.

    Args:
        credentials: Optional bearer token.
        x_api_key: Optional API key from X-API-Key header.
        db: Database session.

    Returns:
        :class:`~models.user.User` or :class:`~models.api_key.APIKey`.

    Raises:
        HTTPException: 401 if neither valid token nor API key provided.
    """
    if x_api_key:
        return await validate_api_key(x_api_key, db)

    if credentials:
        return await get_current_user(credentials, db)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required"
    )
