"""
Endpoints de encuestas comunitarias
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from typing import Optional

from utils.auth import get_current_user, get_current_staff_user
from utils.database import get_db
from models.poll import Poll, PollOption, PollVote
from models.user import User

router = APIRouter(prefix="/polls", tags=["Polls"])


class PollOptionCreate(BaseModel):
    """Schema for creating a poll option."""
    option_text: str

    @field_validator('option_text')
    @classmethod
    def validate_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Option text is required')
        return v


class PollCreate(BaseModel):
    """Schema for creating a poll."""
    title: str
    description: Optional[str] = None
    poll_type: str = 'single'
    closes_at: Optional[datetime] = None
    options: list[PollOptionCreate]

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Title is required')
        return v

    @field_validator('poll_type')
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ('single', 'multiple'):
            raise ValueError('poll_type must be single or multiple')
        return v

    @field_validator('options')
    @classmethod
    def validate_options(cls, v: list) -> list:
        if len(v) < 2:
            raise ValueError('At least 2 options required')
        return v


class PollUpdate(BaseModel):
    """Schema for updating a poll."""
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    closes_at: Optional[datetime] = None


class VoteRequest(BaseModel):
    """Schema for casting a vote."""
    option_id: int


def _serialize_poll(poll: Poll, db: Session, user_id: int = None) -> dict:
    """Serialize a poll with options, vote counts, and user's vote."""
    # Auto-close expired polls
    if poll.is_active and poll.closes_at and poll.closes_at <= datetime.now(timezone.utc):
        poll.is_active = False
        db.commit()

    options = []
    total_votes = db.query(PollVote).filter(PollVote.poll_id == poll.id).count()
    user_vote = None

    if user_id:
        vote = db.query(PollVote).filter(
            PollVote.poll_id == poll.id,
            PollVote.user_id == user_id
        ).first()
        if vote:
            user_vote = vote.option_id

    # Only show stats if user has voted or poll is closed
    show_stats = user_vote is not None or not poll.is_active

    for opt in poll.options:
        vote_count = db.query(PollVote).filter(PollVote.option_id == opt.id).count()
        options.append({
            "id": opt.id,
            "option_text": opt.option_text,
            "option_order": opt.option_order,
            "vote_count": vote_count if show_stats else None,
            "percentage": round(vote_count / total_votes * 100, 1) if total_votes > 0 and show_stats else 0,
        })

    return {
        "id": poll.id,
        "title": poll.title,
        "description": poll.description,
        "poll_type": poll.poll_type,
        "is_active": poll.is_active,
        "closes_at": poll.closes_at.isoformat() if poll.closes_at else None,
        "created_at": poll.created_at.isoformat() if poll.created_at else None,
        "created_by": poll.creator.username if poll.creator else None,
        "options": options,
        "total_votes": total_votes,
        "user_vote": user_vote,
    }


@router.get("")
async def get_polls(db: Session = Depends(get_db)):
    """Obtener todas las encuestas activas"""
    polls = db.query(Poll).filter(Poll.is_active.is_(True)).order_by(Poll.created_at.desc()).all()
    return {"polls": [_serialize_poll(p, db) for p in polls]}


@router.get("/all")
async def get_all_polls(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Obtener todas las encuestas incluyendo inactivas (solo staff)"""
    polls = db.query(Poll).order_by(Poll.created_at.desc()).all()
    return {"polls": [_serialize_poll(p, db) for p in polls]}


@router.get("/{poll_id}")
async def get_poll(
    poll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener una encuesta con opciones y votos"""
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")
    return _serialize_poll(poll, db, user_id=current_user.id)


@router.post("")
async def create_poll(
    data: PollCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Crear una encuesta (solo staff)"""
    poll = Poll(
        title=data.title,
        description=data.description,
        poll_type=data.poll_type,
        closes_at=data.closes_at,
        created_by=current_user.id,
    )
    db.add(poll)
    db.flush()

    for i, opt in enumerate(data.options):
        option = PollOption(
            poll_id=poll.id,
            option_text=opt.option_text,
            option_order=i,
        )
        db.add(option)

    db.commit()
    db.refresh(poll)
    return _serialize_poll(poll, db)


@router.patch("/{poll_id}")
async def update_poll(
    poll_id: int,
    data: PollUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Actualizar una encuesta (solo staff)"""
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(poll, key, value)

    db.commit()
    db.refresh(poll)
    return _serialize_poll(poll, db)


@router.delete("/{poll_id}")
async def delete_poll(
    poll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Eliminar una encuesta (solo staff)"""
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")

    db.delete(poll)
    db.commit()
    return {"message": "Encuesta eliminada"}


@router.post("/{poll_id}/vote")
async def vote(
    poll_id: int,
    data: VoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Votar en una encuesta (usuarios logueados)"""

    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")

    if not poll.is_active:
        raise HTTPException(status_code=400, detail="Esta encuesta ya no acepta votos")

    if poll.closes_at and poll.closes_at <= datetime.now(timezone.utc):
        poll.is_active = False
        db.commit()
        raise HTTPException(status_code=400, detail="Esta encuesta ha expirado")

    # Verify option belongs to poll
    option = db.query(PollOption).filter(
        PollOption.id == data.option_id,
        PollOption.poll_id == poll_id
    ).first()
    if not option:
        raise HTTPException(status_code=400, detail="Opción no válida")

    # Check for existing vote — no changing allowed
    existing = db.query(PollVote).filter(
        PollVote.poll_id == poll_id,
        PollVote.user_id == current_user.id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Ya votaste en esta encuesta")

    vote = PollVote(
        poll_id=poll_id,
        option_id=data.option_id,
        user_id=current_user.id,
    )
    db.add(vote)
    db.commit()
    return _serialize_poll(poll, db, user_id=current_user.id)


@router.delete("/{poll_id}/vote")
async def remove_vote(
    poll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Quitar voto de una encuesta"""
    vote = db.query(PollVote).filter(
        PollVote.poll_id == poll_id,
        PollVote.user_id == current_user.id
    ).first()

    if not vote:
        raise HTTPException(status_code=404, detail="No has votado en esta encuesta")

    db.delete(vote)
    db.commit()

    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    return _serialize_poll(poll, db, user_id=current_user.id)
