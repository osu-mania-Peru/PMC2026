"""Endpoints for tournament slot management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from utils.auth import get_current_staff_user
from utils.database import get_db
from models.slot import Slot
from models.user import User

router = APIRouter(prefix="/slots", tags=["Slots"])


def serialize_slot(slot: Slot) -> dict:
    """Serialize a slot to dict."""
    return {
        "id": slot.id,
        "name": slot.name,
        "color": slot.color,
        "slot_order": slot.slot_order,
    }


class SlotCreate(BaseModel):
    name: str
    color: str = '#3b82f6'
    slot_order: int = 0


class SlotUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    slot_order: int | None = None


@router.get("")
async def get_all_slots(db: Session = Depends(get_db)):
    """Get all slots ordered by slot_order."""
    slots = db.query(Slot).order_by(Slot.slot_order).all()
    return [serialize_slot(s) for s in slots]


@router.post("")
async def create_slot(
    data: SlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Create a new slot (staff only)."""
    existing = db.query(Slot).filter(Slot.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slot name already exists")

    slot = Slot(**data.model_dump())
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return serialize_slot(slot)


@router.put("/{slot_id}")
async def update_slot(
    slot_id: int,
    data: SlotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Update a slot (staff only)."""
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data:
        existing = db.query(Slot).filter(Slot.name == update_data["name"], Slot.id != slot_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Slot name already exists")

    for key, value in update_data.items():
        setattr(slot, key, value)

    db.commit()
    db.refresh(slot)
    return serialize_slot(slot)


@router.delete("/{slot_id}")
async def delete_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Delete a slot (staff only)."""
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    db.delete(slot)
    db.commit()
    return {"message": "Slot deleted"}


@router.delete("/purge")
async def purge_all_slots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Delete all slots (staff only)."""
    count = db.query(Slot).delete()
    db.commit()
    return {"message": f"Deleted {count} slots"}


@router.post("/seed")
async def seed_default_slots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Seed default slots if none exist (staff only)."""
    existing = db.query(Slot).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slots already exist")

    default_slots = [
        {"name": "NM1", "color": "#3b82f6", "slot_order": 0},
        {"name": "NM2", "color": "#3b82f6", "slot_order": 1},
        {"name": "NM3", "color": "#3b82f6", "slot_order": 2},
        {"name": "NM4", "color": "#3b82f6", "slot_order": 3},
        {"name": "HD1", "color": "#eab308", "slot_order": 4},
        {"name": "HD2", "color": "#eab308", "slot_order": 5},
        {"name": "HR1", "color": "#ef4444", "slot_order": 6},
        {"name": "HR2", "color": "#ef4444", "slot_order": 7},
        {"name": "DT1", "color": "#a855f7", "slot_order": 8},
        {"name": "DT2", "color": "#a855f7", "slot_order": 9},
        {"name": "FM1", "color": "#22c55e", "slot_order": 10},
        {"name": "FM2", "color": "#22c55e", "slot_order": 11},
        {"name": "TB", "color": "#f97316", "slot_order": 12},
    ]

    for slot_data in default_slots:
        slot = Slot(**slot_data)
        db.add(slot)

    db.commit()
    return {"message": f"Created {len(default_slots)} default slots"}
