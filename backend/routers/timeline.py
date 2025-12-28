"""Endpoints for tournament timeline/schedule management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from utils.auth import get_current_staff_user
from utils.database import get_db
from models.timeline_event import TimelineEvent
from models.user import User

router = APIRouter(prefix="/timeline", tags=["Timeline"])

# Default timeline data (matches frontend hardcoded values)
DEFAULT_TIMELINE = [
    {"event_id": "registros", "date_range": "16/01 - 01/02", "title": "REGISTROS", "sort_order": 0},
    {"event_id": "screening", "date_range": "01/02 - 08/02", "title": "SCREENING", "sort_order": 1},
    {"event_id": "showcase", "date_range": "08/02", "title": "QUALIFIERS SHOWCASE", "sort_order": 2},
    {"event_id": "qualifiers", "date_range": "13/02 - 15/02", "title": "QUALIFIERS", "sort_order": 3},
    {"event_id": "ro16", "date_range": "27/02 - 01/03", "title": "ROUND OF 16", "sort_order": 4},
    {"event_id": "quarters", "date_range": "06/03 - 08/03", "title": "QUARTERFINALS", "sort_order": 5},
    {"event_id": "semis", "date_range": "13/03 - 15/03", "title": "SEMIFINALS", "sort_order": 6},
    {"event_id": "finals", "date_range": "20/03 - 22/03", "title": "FINALS", "sort_order": 7},
    {"event_id": "grandfinals", "date_range": "27/03 - 29/03", "title": "GRANDFINALS", "sort_order": 8},
]


def seed_timeline_if_empty(db: Session):
    """Seed timeline events if table is empty."""
    if db.query(TimelineEvent).count() == 0:
        for event_data in DEFAULT_TIMELINE:
            db.add(TimelineEvent(**event_data))
        db.commit()


class TimelineEventUpdate(BaseModel):
    date_range: str | None = None
    title: str | None = None


class TimelineEventCreate(BaseModel):
    event_id: str
    date_range: str
    title: str
    sort_order: int = 0


@router.get("")
async def get_timeline(db: Session = Depends(get_db)):
    """Get all timeline events (public)."""
    seed_timeline_if_empty(db)
    events = db.query(TimelineEvent).order_by(TimelineEvent.sort_order).all()
    return {
        "events": [
            {
                "id": e.event_id,
                "date": e.date_range,
                "title": e.title,
            }
            for e in events
        ]
    }


@router.patch("/{event_id}")
async def update_timeline_event(
    event_id: str,
    data: TimelineEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Update a timeline event (staff only)."""
    event = db.query(TimelineEvent).filter(TimelineEvent.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Timeline event not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)
    return {
        "id": event.event_id,
        "date": event.date_range,
        "title": event.title,
    }


@router.put("")
async def update_all_timeline_events(
    events: list[TimelineEventUpdate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Update all timeline events at once (staff only)."""
    db_events = db.query(TimelineEvent).order_by(TimelineEvent.sort_order).all()

    if len(events) != len(db_events):
        raise HTTPException(status_code=400, detail="Event count mismatch")

    for db_event, update_data in zip(db_events, events):
        for key, value in update_data.model_dump(exclude_unset=True).items():
            setattr(db_event, key, value)

    db.commit()

    return {
        "events": [
            {
                "id": e.event_id,
                "date": e.date_range,
                "title": e.title,
            }
            for e in db_events
        ]
    }
