"""
Beatmap pool management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from utils.auth import get_current_staff_user
from utils.database import get_db
from models.map import Map
from models.user import User

router = APIRouter(prefix="/maps", tags=["Maps"])


class MapCreate(BaseModel):
    map_url: str
    map_name: str
    difficulty_name: str
    mapper_name: str


class MapUpdate(BaseModel):
    map_url: str | None = None
    map_name: str | None = None
    difficulty_name: str | None = None
    mapper_name: str | None = None


@router.get("")
async def get_all_maps(db: Session = Depends(get_db)):
    """Get all maps in pool (public)"""
    maps = db.query(Map).all()
    return {"maps": maps, "total": len(maps)}


@router.post("")
async def add_map(
    map_data: MapCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Add map to pool (staff only)"""
    new_map = Map(**map_data.dict())
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    return new_map


@router.get("/{map_id}")
async def get_map(map_id: int, db: Session = Depends(get_db)):
    """Get specific map details"""
    map_obj = db.query(Map).filter(Map.id == map_id).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")
    return map_obj


@router.patch("/{map_id}")
async def update_map(
    map_id: int,
    map_data: MapUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Update map info (staff only)"""
    map_obj = db.query(Map).filter(Map.id == map_id).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")

    for key, value in map_data.dict(exclude_unset=True).items():
        setattr(map_obj, key, value)

    db.commit()
    db.refresh(map_obj)
    return map_obj


@router.delete("/{map_id}")
async def delete_map(
    map_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Remove map from pool (staff only)"""
    map_obj = db.query(Map).filter(Map.id == map_id).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")

    db.delete(map_obj)
    db.commit()
    return {"message": "Map deleted successfully"}
