"""
Whitelist management endpoints for nationality bypass.
Stores whitelist in ~/.config/pmc/whitelist.json
"""
import json
import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from utils.auth import get_current_staff_user
from models.user import User

router = APIRouter(prefix="/whitelist", tags=["Whitelist"])

# Config file path
WHITELIST_PATH = Path.home() / ".config" / "pmc" / "whitelist.json"


def _ensure_config_dir():
    """Ensure config directory exists."""
    WHITELIST_PATH.parent.mkdir(parents=True, exist_ok=True)


def _read_whitelist() -> list[str]:
    """Read whitelist from JSON file."""
    _ensure_config_dir()
    if not WHITELIST_PATH.exists():
        return []
    try:
        with open(WHITELIST_PATH, "r") as f:
            data = json.load(f)
            return data.get("whitelist", [])
    except (json.JSONDecodeError, IOError):
        return []


def _write_whitelist(whitelist: list[str]):
    """Write whitelist to JSON file."""
    _ensure_config_dir()
    with open(WHITELIST_PATH, "w") as f:
        json.dump({"whitelist": whitelist}, f, indent=2)


class AddWhitelistRequest(BaseModel):
    username: str


@router.get("")
async def get_whitelist():
    """Get all whitelisted usernames (public for modal check)."""
    return {"whitelist": _read_whitelist()}


@router.post("")
async def add_to_whitelist(
    request: AddWhitelistRequest,
    current_user: User = Depends(get_current_staff_user)
):
    """Add username to whitelist (staff only)."""
    username = request.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty")

    whitelist = _read_whitelist()
    if username in whitelist:
        raise HTTPException(status_code=409, detail="Username already whitelisted")

    whitelist.append(username)
    _write_whitelist(whitelist)

    return {"message": f"Added {username} to whitelist", "whitelist": whitelist}


@router.delete("/{username}")
async def remove_from_whitelist(
    username: str,
    current_user: User = Depends(get_current_staff_user)
):
    """Remove username from whitelist (staff only)."""
    whitelist = _read_whitelist()
    if username not in whitelist:
        raise HTTPException(status_code=404, detail="Username not in whitelist")

    whitelist.remove(username)
    _write_whitelist(whitelist)

    return {"message": f"Removed {username} from whitelist", "whitelist": whitelist}
