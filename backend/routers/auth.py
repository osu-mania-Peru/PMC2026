"""
Authentication endpoints
NOTE: OAuth flow is handled by auth-service microservice
This only provides token validation endpoints
"""
from fastapi import APIRouter, Depends, HTTPException

from utils.auth import get_current_user
from models.user import User
from schemas.auth import UserResponse, LogoutResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current logged-in user info
    Requires authentication
    """
    return current_user


@router.post("/logout", response_model=LogoutResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout current user
    Note: With JWT, logout is primarily client-side (remove token)
    """
    return LogoutResponse(message="Logged out successfully")
