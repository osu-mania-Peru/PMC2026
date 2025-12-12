"""
Endpoints de gestión de llaves
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from utils.auth import get_current_staff_user
from utils.database import get_db
from models.bracket import Bracket
from models.match import Match
from models.user import User

router = APIRouter(prefix="/brackets", tags=["Brackets"])


@router.get("")
async def get_all_brackets(db: Session = Depends(get_db)):
    """Obtener todas las llaves con estadísticas de partidas"""
    brackets = db.query(Bracket).order_by(Bracket.bracket_order).all()

    result = []
    for bracket in brackets:
        total_matches = db.query(Match).filter(Match.bracket_id == bracket.id).count()
        completed_matches = db.query(Match).filter(
            Match.bracket_id == bracket.id,
            Match.is_completed.is_(True)
        ).count()

        result.append({
            "id": bracket.id,
            "bracket_size": bracket.bracket_size,
            "bracket_name": bracket.bracket_name,
            "bracket_type": bracket.bracket_type,
            "bracket_order": bracket.bracket_order,
            "is_completed": bracket.is_completed,
            "total_matches": total_matches,
            "completed_matches": completed_matches
        })

    return {"brackets": result}


@router.post("")
async def create_bracket(
    bracket_size: int,
    bracket_name: str,
    bracket_order: int,
    bracket_type: str = "winner",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Crear estructura de llave (solo staff)"""
    bracket = Bracket(
        bracket_size=bracket_size,
        bracket_name=bracket_name,
        bracket_order=bracket_order,
        bracket_type=bracket_type
    )
    db.add(bracket)
    db.commit()
    db.refresh(bracket)
    return bracket


@router.get("/{bracket_id}")
async def get_bracket(bracket_id: int, db: Session = Depends(get_db)):
    """Obtener detalles de una llave específica"""
    bracket = db.query(Bracket).filter(Bracket.id == bracket_id).first()
    if not bracket:
        raise HTTPException(status_code=404, detail="Bracket not found")
    return bracket


@router.get("/{bracket_id}/matches")
async def get_bracket_matches(bracket_id: int, db: Session = Depends(get_db)):
    """Obtener todas las partidas de una llave con detalles de jugadores"""
    bracket = db.query(Bracket).filter(Bracket.id == bracket_id).first()
    if not bracket:
        raise HTTPException(status_code=404, detail="Bracket not found")

    matches = db.query(Match).filter(Match.bracket_id == bracket_id).order_by(Match.id).all()

    result = []
    for match in matches:
        player1 = db.query(User).filter(User.id == match.player1_id).first()
        player2 = db.query(User).filter(User.id == match.player2_id).first()
        winner = db.query(User).filter(User.id == match.winner_id).first() if match.winner_id else None

        result.append({
            "id": match.id,
            "bracket_id": match.bracket_id,
            "player1_id": match.player1_id,
            "player1_username": player1.username if player1 else "TBD",
            "player2_id": match.player2_id,
            "player2_username": player2.username if player2 else "TBD",
            "player1_score": match.player1_score,
            "player2_score": match.player2_score,
            "winner_id": match.winner_id,
            "winner_username": winner.username if winner else None,
            "match_status": match.match_status,
            "is_completed": match.is_completed,
            "scheduled_time": match.scheduled_time,
            "round_name": match.round_name,
            "next_match_id": match.next_match_id,
            "loser_next_match_id": match.loser_next_match_id,
            "is_grandfinals_reset": match.is_grandfinals_reset
        })

    return {"matches": result, "total": len(result), "bracket": {"id": bracket.id, "name": bracket.bracket_name, "size": bracket.bracket_size, "type": bracket.bracket_type}}
