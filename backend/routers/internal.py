"""
Internal endpoints for inter-service communication
NOT exposed to public - used by auth service
"""
from fastapi import APIRouter, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from utils.database import get_db
from models.user import User
from fastapi import Depends
from config import Config

router = APIRouter(prefix="/internal", tags=["Internal"], include_in_schema=False)


class UserSyncRequest(BaseModel):
    osu_id: int
    username: str
    flag_code: str


@router.post("/users/sync")
async def sync_user(
    user_data: UserSyncRequest,
    db: Session = Depends(get_db),
    x_internal_secret: str = Header(None)
):
    """
    Create or update user from auth service
    This endpoint is called by the auth microservice after OAuth
    """
    # Verify internal secret (simple auth between services)
    if x_internal_secret != Config.INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Get or create user
    user = db.query(User).filter(User.osu_id == user_data.osu_id).first()

    if not user:
        # Create new user
        user = User(
            osu_id=user_data.osu_id,
            username=user_data.username,
            flag_code=user_data.flag_code,
            is_staff=False,
            is_registered=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[BACKEND] Created new user: {user.username} (ID: {user.osu_id})")
    else:
        # Update existing user info
        user.username = user_data.username
        user.flag_code = user_data.flag_code
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        print(f"[BACKEND] Updated user: {user.username} (ID: {user.osu_id})")

    return {
        "id": user.id,
        "osu_id": user.osu_id,
        "username": user.username,
        "flag_code": user.flag_code,
        "is_staff": user.is_staff,
        "is_registered": user.is_registered,
        "seed_number": user.seed_number,
    }
