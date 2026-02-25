"""Router for PMC Wheel minigame scores."""
import random

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models.user import User
from models.wheel_score import WheelScore
from utils.auth import get_current_user
from utils.database import get_db

router = APIRouter(prefix="/wheel", tags=["Wheel"])

NUM_SEGMENTS = 11
PMC_INDEX = 0

# Segment definitions (must match frontend SEGMENTS order)
SEGMENT_LABELS = [
    "PMC", "Uma", "Miaurichesu", "Gatofuego",
    "Uma", "Miaurichesu", "Gatofuego",
    "Uma", "Miaurichesu", "Gatofuego",
    "Uma", "Miaurichesu",
]
SEGMENT_POINTS = [80, -20, -15, -8, -20, -15, -8, -20, -15, -8, -20, -15]


def _pick_segment(ws: WheelScore) -> int:
    """Pick a segment index, rigging early spins to favor PMC."""
    spin_num = ws.spins + 1

    # Rig: if user hasn't hit PMC yet, or within 3 spins after first PMC hit
    rigged = not ws.has_hit_pmc or (
        ws.first_pmc_spin is not None and spin_num <= ws.first_pmc_spin + 3
    )

    if rigged and random.random() < 0.5:
        return PMC_INDEX

    return random.randint(0, len(SEGMENT_LABELS) - 1)


def _compute_spin(ws: WheelScore) -> dict:
    """Compute a full spin result server-side."""
    seg_idx = _pick_segment(ws)
    label = SEGMENT_LABELS[seg_idx]
    base_points = SEGMENT_POINTS[seg_idx]

    # 15% chance of bonus +15..+30
    bonus = 0
    if random.random() < 0.15:
        bonus = random.randint(15, 30)

    # 8% chance of curse -80..-150 (only if no bonus and not PMC)
    curse = 0
    if bonus == 0 and label != "PMC" and random.random() < 0.08:
        curse = -random.randint(80, 150)

    points = base_points + bonus + curse

    # Update rigging state
    ws.spins += 1
    if label == "PMC" and not ws.has_hit_pmc:
        ws.has_hit_pmc = True
        ws.first_pmc_spin = ws.spins

    ws.score += points

    return {
        "score": ws.score,
        "spins": ws.spins,
        "segment_index": seg_idx,
        "label": label,
        "points": points,
        "bonus": bonus,
        "curse": curse,
    }


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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Compute and record a spin result server-side."""
    ws = db.query(WheelScore).filter(WheelScore.user_id == current_user.id).first()
    if not ws:
        ws = WheelScore(user_id=current_user.id, score=0, spins=0, has_hit_pmc=False)
        db.add(ws)
        db.flush()

    result = _compute_spin(ws)
    db.commit()
    db.refresh(ws)
    return result
