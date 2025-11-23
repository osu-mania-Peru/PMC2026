"""
User management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from utils.auth import get_current_user, get_current_staff_user
from utils.database import get_db
from models.user import User
from schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=dict)
async def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Get all users (staff only)"""
    users = db.query(User).all()
    return {
        "users": users,
        "total": len(users)
    }


@router.get("/registered", response_model=dict)
async def get_registered_players(db: Session = Depends(get_db)):
    """Get all registered players (public)"""
    users = db.query(User).filter(User.is_registered == True).all()
    return {
        "users": users,
        "total": len(users)
    }


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get specific user details (public)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}/staff", response_model=UserResponse)
async def update_user_staff(
    user_id: int,
    is_staff: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Make user staff (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_staff = is_staff
    db.commit()
    db.refresh(user)
    return user
