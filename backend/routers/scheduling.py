"""Endpoints for match scheduling: availability windows and time proposals."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from models.match import Match
from models.notification import Notification
from models.user import User
from models.availability import MatchAvailability, MatchTimeProposal
from utils.auth import get_current_user
from utils.database import get_db

router = APIRouter(prefix="/matches", tags=["Scheduling"])


class AvailabilityWindow(BaseModel):
    start_time: datetime
    end_time: datetime


class AvailabilitySubmit(BaseModel):
    windows: list[AvailabilityWindow]


class ProposeTime(BaseModel):
    proposed_time: datetime


class ProposalResponse(BaseModel):
    status: str  # "accepted" or "rejected"


def _get_match_or_404(match_id: int, db: Session) -> Match:
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


def _is_player_in_match(user: User, match: Match) -> bool:
    return user.id in (match.player1_id, match.player2_id)


def _require_player_or_staff(user: User, match: Match):
    if not user.is_staff and not _is_player_in_match(user, match):
        raise HTTPException(status_code=403, detail="You are not a player in this match")


def _get_opponent_id(user_id: int, match: Match) -> Optional[int]:
    if user_id == match.player1_id:
        return match.player2_id
    return match.player1_id


def _compute_overlap(windows_a: list, windows_b: list) -> list[dict]:
    """Compute overlapping intervals between two sets of time windows."""
    overlaps = []
    for a in windows_a:
        for b in windows_b:
            start = max(a.start_time, b.start_time)
            end = min(a.end_time, b.end_time)
            if start < end:
                overlaps.append({"start_time": start.isoformat(), "end_time": end.isoformat()})
    return overlaps


@router.get("/{match_id}/availability")
async def get_availability(match_id: int, db: Session = Depends(get_db)):
    """Get availability windows for both players and computed overlap."""
    match = _get_match_or_404(match_id, db)

    all_windows = db.query(MatchAvailability).filter(
        MatchAvailability.match_id == match_id
    ).order_by(MatchAvailability.start_time).all()

    p1_windows = [w for w in all_windows if w.user_id == match.player1_id]
    p2_windows = [w for w in all_windows if w.user_id == match.player2_id]

    overlap = _compute_overlap(p1_windows, p2_windows)

    return {
        "player1_id": match.player1_id,
        "player2_id": match.player2_id,
        "player1_windows": [
            {"id": w.id, "start_time": w.start_time.isoformat(), "end_time": w.end_time.isoformat()}
            for w in p1_windows
        ],
        "player2_windows": [
            {"id": w.id, "start_time": w.start_time.isoformat(), "end_time": w.end_time.isoformat()}
            for w in p2_windows
        ],
        "overlap": overlap,
    }


@router.post("/{match_id}/availability")
async def add_availability(
    match_id: int,
    data: AvailabilitySubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add availability windows for the current player. Replaces existing windows."""
    match = _get_match_or_404(match_id, db)
    _require_player_or_staff(current_user, match)

    # Validate windows
    for w in data.windows:
        if w.end_time <= w.start_time:
            raise HTTPException(status_code=400, detail="end_time must be after start_time")

    # Clear existing windows for this user/match
    db.query(MatchAvailability).filter(
        MatchAvailability.match_id == match_id,
        MatchAvailability.user_id == current_user.id,
    ).delete()

    # Insert new windows
    new_windows = []
    for w in data.windows:
        avail = MatchAvailability(
            match_id=match_id,
            user_id=current_user.id,
            start_time=w.start_time,
            end_time=w.end_time,
        )
        db.add(avail)
        new_windows.append(avail)

    # Notify opponent
    opponent_id = _get_opponent_id(current_user.id, match)
    if opponent_id:
        notif = Notification(
            user_id=opponent_id,
            notification_type="scheduling_availability",
            title="Disponibilidad actualizada",
            message=f"{current_user.username} actualizó su disponibilidad para tu partida.",
            related_match_id=match_id,
        )
        db.add(notif)

    db.commit()

    return {
        "message": "Availability saved",
        "windows": [
            {"start_time": w.start_time.isoformat(), "end_time": w.end_time.isoformat()}
            for w in new_windows
        ],
    }


@router.delete("/{match_id}/availability")
async def clear_availability(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear all availability windows for the current player."""
    match = _get_match_or_404(match_id, db)
    _require_player_or_staff(current_user, match)

    deleted = db.query(MatchAvailability).filter(
        MatchAvailability.match_id == match_id,
        MatchAvailability.user_id == current_user.id,
    ).delete()

    db.commit()
    return {"message": f"Cleared {deleted} availability windows"}


@router.post("/{match_id}/propose-time")
async def propose_time(
    match_id: int,
    data: ProposeTime,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Propose a specific time for the match."""
    match = _get_match_or_404(match_id, db)
    _require_player_or_staff(current_user, match)

    proposal = MatchTimeProposal(
        match_id=match_id,
        proposed_by=current_user.id,
        proposed_time=data.proposed_time,
        status="pending",
    )
    db.add(proposal)

    # Notify opponent
    opponent_id = _get_opponent_id(current_user.id, match)
    if opponent_id:
        formatted = data.proposed_time.strftime("%d/%m/%Y %H:%M")
        notif = Notification(
            user_id=opponent_id,
            notification_type="scheduling_proposal",
            title="Propuesta de horario",
            message=f"{current_user.username} propuso jugar el {formatted}.",
            related_match_id=match_id,
        )
        db.add(notif)

    db.commit()
    db.refresh(proposal)

    return {
        "id": proposal.id,
        "proposed_time": proposal.proposed_time.isoformat(),
        "status": proposal.status,
    }


@router.get("/{match_id}/proposals")
async def get_proposals(match_id: int, db: Session = Depends(get_db)):
    """List all time proposals for a match."""
    _get_match_or_404(match_id, db)

    proposals = db.query(MatchTimeProposal).filter(
        MatchTimeProposal.match_id == match_id
    ).order_by(MatchTimeProposal.created_at.desc()).all()

    return {
        "proposals": [
            {
                "id": p.id,
                "proposed_by": p.proposed_by,
                "proposed_time": p.proposed_time.isoformat(),
                "status": p.status,
                "responded_at": p.responded_at.isoformat() if p.responded_at else None,
                "created_at": p.created_at.isoformat(),
            }
            for p in proposals
        ]
    }


@router.patch("/{match_id}/proposals/{proposal_id}")
async def respond_to_proposal(
    match_id: int,
    proposal_id: int,
    data: ProposalResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept or reject a time proposal. Only the opponent can respond."""
    match = _get_match_or_404(match_id, db)
    _require_player_or_staff(current_user, match)

    proposal = db.query(MatchTimeProposal).filter(
        MatchTimeProposal.id == proposal_id,
        MatchTimeProposal.match_id == match_id,
    ).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.proposed_by == current_user.id and not current_user.is_staff:
        raise HTTPException(status_code=403, detail="Cannot respond to your own proposal")

    if proposal.status != "pending":
        raise HTTPException(status_code=400, detail="Proposal already responded to")

    if data.status not in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'accepted' or 'rejected'")

    proposal.status = data.status
    proposal.responded_at = func.now()

    # If accepted, set match scheduled_time
    if data.status == "accepted":
        match.scheduled_time = proposal.proposed_time

    # Notify proposer
    action = "aceptó" if data.status == "accepted" else "rechazó"
    notif = Notification(
        user_id=proposal.proposed_by,
        notification_type="scheduling_response",
        title="Respuesta a propuesta",
        message=f"{current_user.username} {action} tu propuesta de horario.",
        related_match_id=match_id,
    )
    db.add(notif)

    db.commit()

    return {
        "id": proposal.id,
        "status": proposal.status,
        "scheduled_time": match.scheduled_time.isoformat() if match.scheduled_time else None,
    }
