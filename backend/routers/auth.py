"""
Endpoints de autenticación
NOTA: El flujo OAuth es manejado por el microservicio auth-service
Esto solo provee endpoints de validación de tokens
"""
from fastapi import APIRouter, Depends

from utils.auth import get_current_user
from models.user import User
from schemas.auth import UserResponse, LogoutResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Obtener información del usuario actual
    Requiere autenticación
    """
    return current_user


@router.post("/logout", response_model=LogoutResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """
    Cerrar sesión del usuario actual
    Nota: Con JWT, el logout es principalmente del lado del cliente (eliminar token)
    """
    return LogoutResponse(message="Logged out successfully")
