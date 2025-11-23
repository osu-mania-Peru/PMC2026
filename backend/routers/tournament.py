"""
Tournament registration and management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from utils.auth import get_current_user, get_current_staff_user
from utils.database import get_db
from models.user import User
from models.tournament_state import TournamentState

router = APIRouter(prefix="/tournament", tags=["Tournament"])


@router.post("/register")
async def register_for_tournament(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register current user for tournament"""
    # Check if tournament registration is open
    tournament_state = db.query(TournamentState).first()
    if tournament_state and not tournament_state.registration_open:
        raise HTTPException(status_code=400, detail="Registration is closed")

    if current_user.is_registered:
        raise HTTPException(status_code=409, detail="Already registered for tournament")

    current_user.is_registered = True
    current_user.registered_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)

    return {
        "message": "Successfully registered for tournament",
        "user": current_user
    }


@router.delete("/register")
async def unregister_from_tournament(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unregister current user from tournament"""
    if not current_user.is_registered:
        raise HTTPException(status_code=400, detail="Not registered for tournament")

    current_user.is_registered = False
    current_user.registered_at = None
    db.commit()

    return {"message": "Successfully unregistered from tournament"}


@router.get("/registrations")
async def get_registration_stats(db: Session = Depends(get_db)):
    """Get tournament registration statistics"""
    tournament_state = db.query(TournamentState).first()
    registered_users = db.query(User).filter(User.is_registered == True).all()

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
    """Get current tournament state"""
    tournament_state = db.query(TournamentState).first()
    if not tournament_state:
        return {
            "status": "not_started",
            "registration_open": False,
            "total_registered_players": 0
        }

    total_registered = db.query(User).filter(User.is_registered == True).count()

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
