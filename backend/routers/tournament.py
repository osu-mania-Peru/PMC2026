"""
Endpoints de registro y gestión del torneo
"""
import logging
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from datetime import datetime

from utils.auth import get_current_user
from utils.database import get_db
from models.user import User
from models.tournament_state import TournamentState


class RegisterRequest(BaseModel):
    """Request body for tournament registration."""
    discord_username: str

    @field_validator('discord_username')
    @classmethod
    def validate_discord_username(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Discord username is required')
        if len(v) < 2 or len(v) > 32:
            raise ValueError('Discord username must be 2-32 characters')
        # Discord usernames: lowercase, alphanumeric, underscores, periods
        if not re.match(r'^[a-z0-9_.]+$', v.lower()):
            raise ValueError('Invalid Discord username format')
        return v

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tournament", tags=["Tournament"])


@router.post("/register")
async def register_for_tournament(
    request: RegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registrar al usuario actual en el torneo"""
    logger.info(f"[REGISTER] User {current_user.username} (id={current_user.id}) attempting to register with discord: {request.discord_username}")

    # Check if tournament registration is open
    tournament_state = db.query(TournamentState).first()
    if tournament_state and not tournament_state.registration_open:
        logger.warning(f"[REGISTER] Registration closed - user {current_user.username} denied")
        raise HTTPException(status_code=400, detail="Registration is closed")

    if current_user.is_registered:
        logger.warning(f"[REGISTER] User {current_user.username} already registered")
        raise HTTPException(status_code=409, detail="Already registered for tournament")

    current_user.is_registered = True
    current_user.registered_at = datetime.utcnow()
    current_user.discord_username = request.discord_username
    db.commit()
    db.refresh(current_user)

    logger.info(f"[REGISTER] User {current_user.username} successfully registered at {current_user.registered_at}")

    return {
        "message": "Successfully registered for tournament",
        "user": current_user
    }


@router.delete("/register")
async def unregister_from_tournament(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancelar registro del usuario actual del torneo"""
    logger.info(f"[UNREGISTER] User {current_user.username} (id={current_user.id}) attempting to unregister")

    if not current_user.is_registered:
        logger.warning(f"[UNREGISTER] User {current_user.username} not registered")
        raise HTTPException(status_code=400, detail="Not registered for tournament")

    current_user.is_registered = False
    current_user.registered_at = None
    current_user.discord_username = None
    db.commit()

    logger.info(f"[UNREGISTER] User {current_user.username} successfully unregistered")

    return {"message": "Successfully unregistered from tournament"}


@router.get("/registrations")
async def get_registration_stats(db: Session = Depends(get_db)):
    """Obtener estadísticas de registro del torneo"""
    tournament_state = db.query(TournamentState).first()
    registered_users = db.query(User).filter(User.is_registered.is_(True)).all()

    total_registered = len(registered_users)
    max_spots = 32
    registration_open = tournament_state.registration_open if tournament_state else False

    return {
        "total_registered": total_registered,
        "registration_open": registration_open,
        "spots_remaining": max(0, max_spots - total_registered),
        "registered_players": registered_users
    }


@router.get("/status")
async def get_tournament_status(db: Session = Depends(get_db)):
    """Obtener estado actual del torneo"""
    tournament_state = db.query(TournamentState).first()
    if not tournament_state:
        return {
            "status": "not_started",
            "registration_open": False,
            "total_registered_players": 0
        }

    total_registered = db.query(User).filter(User.is_registered.is_(True)).count()

    result = {
        "status": tournament_state.status,
        "registration_open": tournament_state.registration_open,
        "total_registered_players": total_registered,
        "started_at": tournament_state.started_at,
        "ended_at": tournament_state.ended_at
    }

    if tournament_state.current_bracket:
        result["current_bracket"] = {
            "id": tournament_state.current_bracket.id,
            "bracket_name": tournament_state.current_bracket.bracket_name,
            "bracket_size": tournament_state.current_bracket.bracket_size,
        }

    return result
