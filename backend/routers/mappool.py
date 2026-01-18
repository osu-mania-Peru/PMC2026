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
from services.beatmap_downloader import beatmap_downloader

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
        "beatmapset_id": m.beatmapset_id,
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


# === Beatmap sync/download endpoints ===

@router.post("/sync")
async def sync_all_beatmaps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """
    Sync all mappool beatmaps (staff only).

    For each map in the mappool:
    1. Lookup beatmapset_id if missing
    2. Download and extract .osz if not already on disk

    Returns summary of sync results.
    """
    maps = db.query(MappoolMap).all()

    results = {
        "total": len(maps),
        "downloaded": 0,
        "already_exists": 0,
        "errors": 0,
        "details": [],
    }

    for m in maps:
        # Get beatmapset_id if not stored
        beatmapset_id = m.beatmapset_id
        if not beatmapset_id:
            # Look it up from osu! API
            beatmap_data = await osu_api.get_beatmap(int(m.beatmap_id))
            if beatmap_data:
                beatmapset_id = beatmap_data.get("beatmapset_id")
                # Save it to database for future
                m.beatmapset_id = beatmapset_id
                db.commit()

        if not beatmapset_id:
            results["errors"] += 1
            results["details"].append({
                "beatmap_id": m.beatmap_id,
                "slot": m.slot,
                "status": "error",
                "error": "Could not determine beatmapset_id",
            })
            continue

        # Download the beatmapset
        download_result = await beatmap_downloader.download(beatmapset_id)

        if download_result["status"] == "downloaded":
            results["downloaded"] += 1
        elif download_result["status"] == "exists":
            results["already_exists"] += 1
        else:
            results["errors"] += 1

        results["details"].append({
            "beatmap_id": m.beatmap_id,
            "beatmapset_id": beatmapset_id,
            "slot": m.slot,
            **download_result,
        })

    return results


@router.get("/sync/status")
async def get_sync_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """
    Check download status of all mappool beatmaps (staff only).

    Returns which beatmaps are downloaded and which are missing.
    """
    maps = db.query(MappoolMap).all()

    results = {
        "total": len(maps),
        "downloaded": 0,
        "missing": 0,
        "no_beatmapset_id": 0,
        "maps": [],
    }

    for m in maps:
        map_info = {
            "beatmap_id": m.beatmap_id,
            "beatmapset_id": m.beatmapset_id,
            "slot": m.slot,
            "title": m.title,
        }

        if not m.beatmapset_id:
            map_info["status"] = "no_beatmapset_id"
            results["no_beatmapset_id"] += 1
        elif beatmap_downloader.exists(m.beatmapset_id):
            map_info["status"] = "downloaded"
            map_info["files"] = beatmap_downloader.get_beatmap_files(m.beatmapset_id)
            results["downloaded"] += 1
        else:
            map_info["status"] = "missing"
            results["missing"] += 1

        results["maps"].append(map_info)

    return results


@router.get("/preview/{beatmap_id}")
async def get_beatmap_preview_data(
    beatmap_id: str,
    db: Session = Depends(get_db),
):
    """
    Get parsed notes data for beatmap preview (public).

    Returns notes JSON for rendering in the frontend preview component.
    Auto-downloads and parses beatmapset if not already available.

    Args:
        beatmap_id: The osu! beatmap ID.
    """
    # Find the map in database to get beatmapset_id and difficulty_name
    map_obj = db.query(MappoolMap).filter(MappoolMap.beatmap_id == beatmap_id).first()

    beatmapset_id = None
    difficulty_name = None

    if map_obj:
        beatmapset_id = map_obj.beatmapset_id
        difficulty_name = map_obj.difficulty_name

    if not beatmapset_id:
        # Look up beatmapset_id from osu! API
        beatmap_data = await osu_api.get_beatmap(int(beatmap_id))
        if not beatmap_data:
            raise HTTPException(status_code=404, detail="Beatmap not found on osu!")
        beatmapset_id = str(beatmap_data.get("beatmapset_id"))
        # Also get difficulty name from API if we don't have it
        if not difficulty_name:
            difficulty_name = beatmap_data.get("version")

        # Save beatmapset_id to database for future
        if map_obj and beatmapset_id:
            map_obj.beatmapset_id = beatmapset_id
            db.commit()

    if not beatmapset_id:
        raise HTTPException(status_code=404, detail="Could not determine beatmapset_id")

    # Download if not exists
    if not beatmap_downloader.exists(beatmapset_id):
        download_result = await beatmap_downloader.download(beatmapset_id)
        if download_result["status"] == "error":
            raise HTTPException(status_code=500, detail=download_result.get("error", "Download failed"))
        if download_result["status"] == "not_found":
            raise HTTPException(status_code=404, detail="Beatmapset not found on mirror")

    # Use difficulty_name from database/API to get correct difficulty
    notes_data = beatmap_downloader.get_notes_json(beatmapset_id, difficulty_name)
    if not notes_data:
        # Try to regenerate
        beatmap_downloader.generate_notes_json(beatmapset_id)
        notes_data = beatmap_downloader.get_notes_json(beatmapset_id, difficulty_name)

    if not notes_data:
        raise HTTPException(status_code=404, detail="Could not parse beatmap")

    # Add URLs for audio and background
    notes_data["audio_url"] = f"/beatmaps/{beatmapset_id}/{notes_data.get('audio_file', '')}"
    notes_data["background_url"] = f"/beatmaps/{beatmapset_id}/{notes_data.get('background_file', '')}"

    # Add base URL for storyboard images
    if notes_data.get("storyboard"):
        notes_data["storyboard_base_url"] = f"/beatmaps/{beatmapset_id}/"

    return notes_data
