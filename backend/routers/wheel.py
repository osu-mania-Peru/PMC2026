"""Router for PMC Wheel minigame scores."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.user import User
from models.wheel_score import WheelScore
from utils.auth import get_current_user
from utils.database import get_db

router = APIRouter(prefix="/wheel", tags=["Wheel"])


class SpinResult(BaseModel):
    """Payload sent after a spin."""
    points: int


@router.get("/score")
async def get_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's wheel score."""
    ws = db.query(WheelScore).filter(WheelScore.user_id == current_user.id).first()
    if not ws:
        return {"score": 0, "spins": 0}
    return {"score": ws.score, "spins": ws.spins}


@router.post("/spin")
async def record_spin(
    result: SpinResult,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a spin result and update score."""
    ws = db.query(WheelScore).filter(WheelScore.user_id == current_user.id).first()
    if not ws:
        ws = WheelScore(user_id=current_user.id, score=0, spins=0)
        db.add(ws)

    ws.score += result.points
    ws.spins += 1
    db.commit()
    db.refresh(ws)
    return {"score": ws.score, "spins": ws.spins}
