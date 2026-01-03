"""Endpoints for tournament mappool management."""
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from utils.auth import get_current_staff_user
from utils.database import get_db
from models.mappool import Mappool, MappoolMap
from models.user import User
from services.osu_api import osu_api

router = APIRouter(prefix="/mappools", tags=["Mappools"])


def format_length(seconds: int) -> str:
    """Format seconds as MM:SS."""
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}:{secs:02d}"


def serialize_map(m: MappoolMap) -> dict:
    """Serialize a mappool map to dict."""
    return {
        "id": m.id,
        "slot": m.slot,
        "slot_order": m.slot_order,
        "beatmap_id": m.beatmap_id,
        "artist": m.artist,
        "title": m.title,
        "difficulty_name": m.difficulty_name,
        "banner_url": m.banner_url,
        "star_rating": float(m.star_rating),
        "bpm": m.bpm,
        "length": format_length(m.length_seconds),
        "length_seconds": m.length_seconds,
        "od": float(m.od),
        "hp": float(m.hp),
        "ln_percent": m.ln_percent,
        "mapper": m.mapper,
        "is_custom_map": m.is_custom_map,
        "is_custom_song": m.is_custom_song,
    }


def serialize_mappool(pool: Mappool, include_maps: bool = True) -> dict:
    """Serialize a mappool to dict."""
    result = {
        "id": pool.id,
        "stage_name": pool.stage_name,
        "stage_order": pool.stage_order,
        "download_url": pool.download_url,
        "is_visible": pool.is_visible,
        "map_count": len(pool.maps) if pool.maps else 0,
    }
    if include_maps:
        result["maps"] = [serialize_map(m) for m in sorted(pool.maps, key=lambda x: x.slot_order)]
    return result


# Pydantic models for request/response
class MappoolCreate(BaseModel):
    stage_name: str
    stage_order: int = 0
    download_url: str | None = None
    is_visible: bool = True


class MappoolUpdate(BaseModel):
    stage_name: str | None = None
    stage_order: int | None = None
    download_url: str | None = None
    is_visible: bool | None = None


class MapCreate(BaseModel):
    slot: str
    slot_order: int = 0
    beatmap_id: str
    artist: str
    title: str
    difficulty_name: str
    banner_url: str | None = None
    star_rating: float
    bpm: int
    length_seconds: int
    od: float
    hp: float
    ln_percent: str = '0'
    mapper: str
    is_custom_map: bool = False
    is_custom_song: bool = False


class MapUpdate(BaseModel):
    slot: str | None = None
    slot_order: int | None = None
    beatmap_id: str | None = None
    artist: str | None = None
    title: str | None = None
    difficulty_name: str | None = None
    banner_url: str | None = None
    star_rating: float | None = None
    bpm: int | None = None
    length_seconds: int | None = None
    od: float | None = None
    hp: float | None = None
    ln_percent: str | None = None
    mapper: str | None = None
    is_custom_map: bool | None = None
    is_custom_song: bool | None = None


# === Mappool endpoints ===

@router.get("")
async def get_all_mappools(db: Session = Depends(get_db)):
    """Get all mappools with their maps (public, only visible pools)."""
    pools = db.query(Mappool).filter(Mappool.is_visible.is_(True)).order_by(Mappool.stage_order).all()
    total_maps = sum(len(pool.maps) for pool in pools)
    return {
        "total_maps": total_maps,
        "pools": [serialize_mappool(pool) for pool in pools]
    }


@router.get("/all")
async def get_all_mappools_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Get all mappools including hidden ones (staff only)."""
    pools = db.query(Mappool).order_by(Mappool.stage_order).all()
    total_maps = sum(len(pool.maps) for pool in pools)
    return {
        "total_maps": total_maps,
        "pools": [serialize_mappool(pool) for pool in pools]
    }


@router.get("/{pool_id}")
async def get_mappool(pool_id: int, db: Session = Depends(get_db)):
    """Get a specific mappool with maps (public)."""
    pool = db.query(Mappool).filter(Mappool.id == pool_id).first()
    if not pool:
        raise HTTPException(status_code=404, detail="Mappool not found")
    if not pool.is_visible:
        raise HTTPException(status_code=404, detail="Mappool not found")
    return serialize_mappool(pool)


@router.post("")
async def create_mappool(
    data: MappoolCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Create a new mappool (staff only)."""
    pool = Mappool(**data.model_dump())
    db.add(pool)
    db.commit()
    db.refresh(pool)
    return serialize_mappool(pool)


@router.put("/{pool_id}")
async def update_mappool(
    pool_id: int,
    data: MappoolUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Update a mappool (staff only)."""
    pool = db.query(Mappool).filter(Mappool.id == pool_id).first()
    if not pool:
        raise HTTPException(status_code=404, detail="Mappool not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(pool, key, value)

    db.commit()
    db.refresh(pool)
    return serialize_mappool(pool)


@router.delete("/{pool_id}")
async def delete_mappool(
    pool_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Delete a mappool and all its maps (staff only)."""
    pool = db.query(Mappool).filter(Mappool.id == pool_id).first()
    if not pool:
        raise HTTPException(status_code=404, detail="Mappool not found")

    db.delete(pool)
    db.commit()
    return {"message": "Mappool deleted"}


# === Beatmap lookup ===

@router.get("/lookup/{beatmap_id}")
async def lookup_beatmap(
    beatmap_id: int,
    current_user: User = Depends(get_current_staff_user)
):
    """
    Lookup beatmap data from osu! API (staff only).

    Returns beatmap metadata including artist, title, difficulty, mapper,
    star rating, BPM, length, and other stats.
    """
    data = await osu_api.get_beatmap(beatmap_id)
    if not data:
        raise HTTPException(status_code=404, detail="Beatmap not found")
    return data


@router.get("/lookup-set/{beatmapset_id}")
async def lookup_beatmapset(
    beatmapset_id: int,
    current_user: User = Depends(get_current_staff_user)
):
    """
    Lookup beatmapset data from osu! API (staff only).

    Returns beatmapset metadata with all available difficulties.
    """
    data = await osu_api.get_beatmapset(beatmapset_id)
    if not data:
        raise HTTPException(status_code=404, detail="Beatmapset not found")
    return data


# === Map endpoints ===

@router.post("/{pool_id}/maps")
async def add_map_to_pool(
    pool_id: int,
    data: MapCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Add a map to a mappool (staff only)."""
    pool = db.query(Mappool).filter(Mappool.id == pool_id).first()
    if not pool:
        raise HTTPException(status_code=404, detail="Mappool not found")

    map_data = data.model_dump()
    map_data["mappool_id"] = pool_id
    # Convert floats to Decimal for database
    map_data["star_rating"] = Decimal(str(map_data["star_rating"]))
    map_data["od"] = Decimal(str(map_data["od"]))
    map_data["hp"] = Decimal(str(map_data["hp"]))

    new_map = MappoolMap(**map_data)
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    return serialize_map(new_map)


@router.put("/maps/{map_id}")
async def update_map(
    map_id: int,
    data: MapUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Update a map in a mappool (staff only)."""
    map_obj = db.query(MappoolMap).filter(MappoolMap.id == map_id).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")

    update_data = data.model_dump(exclude_unset=True)
    # Convert floats to Decimal for database
    if "star_rating" in update_data:
        update_data["star_rating"] = Decimal(str(update_data["star_rating"]))
    if "od" in update_data:
        update_data["od"] = Decimal(str(update_data["od"]))
    if "hp" in update_data:
        update_data["hp"] = Decimal(str(update_data["hp"]))

    for key, value in update_data.items():
        setattr(map_obj, key, value)

    db.commit()
    db.refresh(map_obj)
    return serialize_map(map_obj)


@router.delete("/maps/{map_id}")
async def delete_map(
    map_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Delete a map from a mappool (staff only)."""
    map_obj = db.query(MappoolMap).filter(MappoolMap.id == map_id).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")

    db.delete(map_obj)
    db.commit()
    return {"message": "Map deleted"}
