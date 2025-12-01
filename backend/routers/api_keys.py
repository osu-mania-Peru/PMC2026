"""
API Key management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from utils.database import get_db
from utils.auth import get_current_staff_user, generate_api_key
from models.user import User
from models.api_key import APIKey

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


class APIKeyCreate(BaseModel):
    name: str
    expires_at: Optional[datetime] = None


class APIKeyResponse(BaseModel):
    id: int
    key_prefix: str
    name: str
    is_active: bool
    last_used_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("")
async def create_api_key(
    data: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Generar una nueva API key (solo staff). La key solo se muestra una vez."""
    raw_key, key_hash = generate_api_key()

    api_key = APIKey(
        key_hash=key_hash,
        key_prefix=raw_key[:12],
        name=data.name,
        created_by_id=current_user.id,
        expires_at=data.expires_at
    )

    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return {
        "api_key": {
            "id": api_key.id,
            "key_prefix": api_key.key_prefix,
            "name": api_key.name,
            "is_active": api_key.is_active,
            "expires_at": api_key.expires_at,
            "created_at": api_key.created_at
        },
        "raw_key": raw_key,
        "warning": "Save this key now. It cannot be retrieved again."
    }


@router.get("", response_model=dict)
async def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Listar todas las API keys (solo staff)"""
    keys = db.query(APIKey).all()
    return {
        "api_keys": [
            {
                "id": k.id,
                "key_prefix": k.key_prefix,
                "name": k.name,
                "is_active": k.is_active,
                "last_used_at": k.last_used_at,
                "expires_at": k.expires_at,
                "created_at": k.created_at,
                "created_by_id": k.created_by_id
            }
            for k in keys
        ],
        "total": len(keys)
    }


@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Revocar una API key (solo staff)"""
    api_key = db.query(APIKey).filter(APIKey.id == key_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.is_active = False
    db.commit()

    return {
        "message": "API key revoked",
        "key_prefix": api_key.key_prefix
    }
