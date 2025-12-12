"""
Endpoints de gestión de usuarios
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from utils.auth import get_current_staff_user, get_user_or_api_key
from utils.database import get_db
from models.user import User
from schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=dict)
async def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Obtener todos los usuarios (solo staff)"""
    users = db.query(User).all()
    return {
        "users": users,
        "total": len(users)
    }


@router.get("/all", response_model=dict)
async def get_all_users_public(db: Session = Depends(get_db)):
    """Obtener todos los usuarios (público - solo para testing)"""
    users = db.query(User).all()
    return {
        "users": users,
        "total": len(users)
    }


@router.get("/registered", response_model=dict)
async def get_registered_players(
    db: Session = Depends(get_db),
    _auth = Depends(get_user_or_api_key)
):
    """Obtener todos los jugadores registrados (requiere autenticación o API key)"""
    users = db.query(User).filter(User.is_registered.is_(True)).all()
    return {
        "users": users,
        "total": len(users)
    }


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Obtener detalles de un usuario específico (público)"""
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
    """Asignar rol de staff a usuario (solo admin)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_staff = is_staff
    db.commit()
    db.refresh(user)
    return user
