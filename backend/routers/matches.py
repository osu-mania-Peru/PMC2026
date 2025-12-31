"""
Endpoints de gestión de partidas
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from utils.auth import get_current_user, get_current_staff_user
from utils.database import get_db
from models.match import Match
from models.user import User
from services.bracket_progression import BracketProgressionService

router = APIRouter(prefix="/matches", tags=["Matches"])


class MatchCreate(BaseModel):
    bracket_id: int
    player1_id: int
    player2_id: int
    map_id: int
    scheduled_time: Optional[datetime] = None


class ScoreUpdate(BaseModel):
    player1_score: int
    player2_score: int
    winner_id: int


class MatchUpdate(BaseModel):
    """Schema for updating match details (staff only)."""
    player1_id: Optional[int] = None
    player2_id: Optional[int] = None
    player1_score: Optional[int] = None
    player2_score: Optional[int] = None
    winner_id: Optional[int] = None
    scheduled_time: Optional[datetime] = None
    match_status: Optional[str] = None
    round_name: Optional[str] = None
    forfeit_reason: Optional[str] = None
    no_show_player_id: Optional[int] = None


@router.get("")
async def get_matches(
    bracket_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Obtener todas las partidas con filtros opcionales"""
    query = db.query(Match)

    if bracket_id:
        query = query.filter(Match.bracket_id == bracket_id)
    if status:
        query = query.filter(Match.match_status == status)

    matches = query.all()
    return {"matches": matches, "total": len(matches)}


@router.post("")
async def create_match(
    match_data: MatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Crear una nueva partida (solo staff)"""
    new_match = Match(**match_data.dict())
    db.add(new_match)
    db.commit()
    db.refresh(new_match)
    return new_match


@router.get("/{match_id}")
async def get_match(match_id: int, db: Session = Depends(get_db)):
    """Obtener detalles de una partida específica"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.put("/{match_id}")
async def update_match(
    match_id: int,
    data: MatchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """
    Update match details (staff only).

    Allows editing players, scores, status, scheduling, and other match fields.
    """
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Validate match_status if provided
    valid_statuses = {'scheduled', 'in_progress', 'completed', 'cancelled', 'forfeit'}
    if data.match_status and data.match_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid match_status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Validate player IDs if provided
    if data.player1_id:
        player1 = db.query(User).filter(User.id == data.player1_id).first()
        if not player1:
            raise HTTPException(status_code=400, detail="Player 1 not found")
    if data.player2_id:
        player2 = db.query(User).filter(User.id == data.player2_id).first()
        if not player2:
            raise HTTPException(status_code=400, detail="Player 2 not found")

    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(match, key, value)

    # Auto-set is_completed if status is completed
    if data.match_status == 'completed':
        match.is_completed = True
    elif data.match_status in {'scheduled', 'in_progress'}:
        match.is_completed = False

    db.commit()
    db.refresh(match)
    return match


@router.patch("/{match_id}/score")
async def update_match_score(
    match_id: int,
    score_data: ScoreUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enviar/actualizar puntajes de la partida (staff o jugadores de la partida)"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Check permissions: staff or player in the match
    is_player = current_user.id in [match.player1_id, match.player2_id]
    if not current_user.is_staff and not is_player:
        raise HTTPException(status_code=403, detail="Not authorized to update this match")

    match.player1_score = score_data.player1_score
    match.player2_score = score_data.player2_score
    match.winner_id = score_data.winner_id
    match.is_completed = True
    match.match_status = "completed"

    db.commit()
    db.refresh(match)

    # Auto-progress players to next matches
    try:
        progression_service = BracketProgressionService(db)
        progression_result = progression_service.progress_match(match)

        return {
            "match": match,
            "progression": progression_result
        }
    except Exception as e:
        # If progression fails, still return the match result
        # but log the error
        print(f"Match progression error: {str(e)}")
        return {
            "match": match,
            "progression": {"error": str(e)}
        }


@router.patch("/{match_id}/complete")
async def complete_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Marcar partida como completada (solo staff)"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match.is_completed = True
    match.match_status = "completed"
    db.commit()
    db.refresh(match)
    return match


@router.delete("/{match_id}")
async def delete_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Eliminar partida (solo staff)"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    db.delete(match)
    db.commit()
    return {"message": "Match deleted successfully"}
