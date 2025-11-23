"""
JWT token utilities
"""
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any
from config import Config


def create_access_token(data: Dict[str, Any]) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=Config.JWT_EXPIRATION_DAYS)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        Config.SECRET_KEY,
        algorithm=Config.JWT_ALGORITHM
    )
    return encoded_jwt
