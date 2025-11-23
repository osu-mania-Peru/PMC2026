"""
Bracket management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from utils.auth import get_current_staff_user
from utils.database import get_db
from models.bracket import Bracket
from models.match import Match
from models.user import User

router = APIRouter(prefix="/brackets", tags=["Brackets"])


@router.get("")
async def get_all_brackets(db: Session = Depends(get_db)):
    """Get all brackets with match statistics"""
    brackets = db.query(Bracket).order_by(Bracket.bracket_order).all()

    result = []
    for bracket in brackets:
        total_matches = db.query(Match).filter(Match.bracket_id == bracket.id).count()
        completed_matches = db.query(Match).filter(
            Match.bracket_id == bracket.id,
            Match.is_completed == True
        ).count()

        result.append({
            "id": bracket.id,
            "bracket_size": bracket.bracket_size,
            "bracket_name": bracket.bracket_name,
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Create bracket structure (staff only)"""
    bracket = Bracket(
        bracket_size=bracket_size,
        bracket_name=bracket_name,
        bracket_order=bracket_order
    )
    db.add(bracket)
    db.commit()
    db.refresh(bracket)
    return bracket


@router.get("/{bracket_id}")
async def get_bracket(bracket_id: int, db: Session = Depends(get_db)):
    """Get specific bracket details"""
    bracket = db.query(Bracket).filter(Bracket.id == bracket_id).first()
    if not bracket:
        raise HTTPException(status_code=404, detail="Bracket not found")
    return bracket


@router.get("/{bracket_id}/matches")
async def get_bracket_matches(bracket_id: int, db: Session = Depends(get_db)):
    """Get all matches in a bracket"""
    bracket = db.query(Bracket).filter(Bracket.id == bracket_id).first()
    if not bracket:
        raise HTTPException(status_code=404, detail="Bracket not found")

    matches = db.query(Match).filter(Match.bracket_id == bracket_id).all()
    return {"matches": matches, "total": len(matches)}
