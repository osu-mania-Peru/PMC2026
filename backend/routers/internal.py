"""
Endpoints internos para comunicación entre servicios y herramientas de admin
NO expuesto al público - usado por el servicio de auth y panel de admin
"""
from fastapi import APIRouter, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import random

from utils.database import get_db
from models.user import User
from models.bracket import Bracket
from models.match import Match
from models.map import Map
from fastapi import Depends
from config import Config

router = APIRouter(prefix="/internal", tags=["Internal"], include_in_schema=False)


class UserSyncRequest(BaseModel):
    osu_id: int
    username: str
    flag_code: str


@router.post("/users/sync")
async def sync_user(
    user_data: UserSyncRequest,
    db: Session = Depends(get_db),
    x_internal_secret: str = Header(None)
):
    """
    Crear o actualizar usuario desde el servicio de auth
    Este endpoint es llamado por el microservicio de auth después de OAuth
    """
    # Verify internal secret (simple auth between services)
    if x_internal_secret != Config.INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Get or create user
    user = db.query(User).filter(User.osu_id == user_data.osu_id).first()

    if not user:
        # Create new user
        user = User(
            osu_id=user_data.osu_id,
            username=user_data.username,
            flag_code=user_data.flag_code,
            is_staff=False,
            is_registered=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[BACKEND] Created new user: {user.username} (ID: {user.osu_id})")
    else:
        # Update existing user info
        user.username = user_data.username
        user.flag_code = user_data.flag_code
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        print(f"[BACKEND] Updated user: {user.username} (ID: {user.osu_id})")

    return {
        "id": user.id,
        "osu_id": user.osu_id,
        "username": user.username,
        "flag_code": user.flag_code,
        "is_staff": user.is_staff,
        "is_registered": user.is_registered,
        "seed_number": user.seed_number,
    }


# Admin Debug Endpoints (Password Protected)

def verify_admin_password(x_admin_password: str = Header(None)):
    """Verificar que la contraseña de admin coincida con INTERNAL_SECRET"""
    if x_admin_password != Config.INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin password")
    return True


@router.post("/admin/seed-database")
async def seed_database(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_password)
):
    """Poblar base de datos con datos de torneo de prueba"""

    # Create test players if needed
    test_players = []
    for i in range(1, 17):
        player = db.query(User).filter(User.osu_id == 9000000 + i).first()
        if not player:
            player = User(
                osu_id=9000000 + i,
                username=f"TestPlayer{i}",
                flag_code="US",
                is_staff=False,
                is_registered=True,
                seed_number=i
            )
            db.add(player)
        test_players.append(player)

    db.commit()

    # Get or create a test map
    test_map = db.query(Map).first()
    if not test_map:
        test_map = Map(
            beatmap_id=1,
            artist="Test Artist",
            title="Test Song",
            difficulty="Test Diff",
            mod_combination="NM",
            star_rating=5.0
        )
        db.add(test_map)
        db.commit()

    # Create Winner Bracket
    winner_bracket = db.query(Bracket).filter(Bracket.bracket_type == 'winner').first()
    if not winner_bracket:
        winner_bracket = Bracket(
            bracket_size=16,
            bracket_name="Winner Bracket",
            bracket_type="winner",
            bracket_order=1
        )
        db.add(winner_bracket)
        db.commit()

    # Create Loser Bracket
    loser_bracket = db.query(Bracket).filter(Bracket.bracket_type == 'loser').first()
    if not loser_bracket:
        loser_bracket = Bracket(
            bracket_size=16,
            bracket_name="Loser Bracket",
            bracket_type="loser",
            bracket_order=2
        )
        db.add(loser_bracket)
        db.commit()

    # Create Grand Finals Bracket
    gf_bracket = db.query(Bracket).filter(Bracket.bracket_type == 'grandfinals').first()
    if not gf_bracket:
        gf_bracket = Bracket(
            bracket_size=2,
            bracket_name="Grand Finals",
            bracket_type="grandfinals",
            bracket_order=3
        )
        db.add(gf_bracket)
        db.commit()

    # Create Round of 16 matches (Winner Bracket)
    winner_matches = []
    for i in range(8):
        match = Match(
            bracket_id=winner_bracket.id,
            player1_id=test_players[i*2].id,
            player2_id=test_players[i*2 + 1].id,
            map_id=test_map.id,
            round_name="Round of 16",
            match_status="scheduled"
        )
        db.add(match)
        winner_matches.append(match)

    db.commit()

    return {
        "message": "Database seeded successfully",
        "players_created": len(test_players),
        "brackets_created": 3,
        "matches_created": len(winner_matches)
    }


@router.post("/admin/simulate-match/{match_id}")
async def simulate_match(
    match_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_password)
):
    """Simular finalización de partida con puntajes aleatorios"""
    from services.bracket_progression import BracketProgressionService

    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.is_completed:
        raise HTTPException(status_code=400, detail="Match already completed")

    # Random scores (best of 7)
    player1_score = random.randint(0, 4)
    player2_score = 4 if player1_score < 4 else random.randint(0, 3)

    match.player1_score = player1_score
    match.player2_score = player2_score
    match.winner_id = match.player1_id if player1_score > player2_score else match.player2_id
    match.is_completed = True
    match.match_status = "completed"

    db.commit()

    # Progress the bracket
    try:
        progression_service = BracketProgressionService(db)
        progression_result = progression_service.progress_match(match)
    except Exception as e:
        progression_result = {"error": str(e)}

    return {
        "match_id": match.id,
        "winner_id": match.winner_id,
        "score": f"{player1_score}-{player2_score}",
        "progression": progression_result
    }


@router.delete("/admin/reset-tournament")
async def reset_tournament(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_password)
):
    """Eliminar todos los datos del torneo (llaves, partidas)"""

    # Delete all matches
    matches_deleted = db.query(Match).delete()

    # Delete all brackets
    brackets_deleted = db.query(Bracket).delete()

    db.commit()

    return {
        "message": "Tournament data reset successfully",
        "matches_deleted": matches_deleted,
        "brackets_deleted": brackets_deleted
    }


@router.get("/admin/tournament-state")
async def get_tournament_state(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_password)
):
    """Obtener estado actual del torneo para depuración"""

    brackets = db.query(Bracket).all()
    matches = db.query(Match).all()
    players = db.query(User).filter(User.is_registered.is_(True)).all()

    bracket_summary = []
    for bracket in brackets:
        matches_in_bracket = [m for m in matches if m.bracket_id == bracket.id]
        completed = sum(1 for m in matches_in_bracket if m.is_completed)

        bracket_summary.append({
            "id": bracket.id,
            "name": bracket.bracket_name,
            "type": bracket.bracket_type,
            "total_matches": len(matches_in_bracket),
            "completed_matches": completed
        })

    return {
        "brackets": bracket_summary,
        "total_matches": len(matches),
        "completed_matches": sum(1 for m in matches if m.is_completed),
        "registered_players": len(players)
    }
