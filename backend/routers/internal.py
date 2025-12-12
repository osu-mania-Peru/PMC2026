"""
Endpoints internos para comunicación entre servicios y herramientas de admin
NO expuesto al público - usado por el servicio de auth y panel de admin
"""
from fastapi import APIRouter, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import random
import math

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
            map_url="https://osu.ppy.sh/beatmaps/1",
            map_name="Test Song",
            difficulty_name="Test Diff",
            mapper_name="Test Mapper"
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


class GenerateBracketRequest(BaseModel):
    bracket_size: int = 32  # 32, 16, 8


@router.post("/admin/generate-brackets")
async def generate_brackets(
    request: GenerateBracketRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_password)
):
    """
    Generate full double elimination bracket structure with registered players.
    Creates winner bracket, loser bracket, and grand finals.
    """
    import logging
    logger = logging.getLogger(__name__)

    # Get registered players ordered by seed
    players = db.query(User).filter(
        User.is_registered.is_(True)
    ).order_by(User.seed_number.asc().nullslast()).all()

    if len(players) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 registered players")

    bracket_size = request.bracket_size
    if bracket_size not in [4, 8, 16, 32]:
        raise HTTPException(status_code=400, detail="Bracket size must be 4, 8, 16, or 32")

    if len(players) > bracket_size:
        players = players[:bracket_size]  # Take top seeds

    # Clear existing brackets and matches
    db.query(Match).delete()
    db.query(Bracket).delete()
    db.commit()

    # Get or create default map
    default_map = db.query(Map).first()
    if not default_map:
        default_map = Map(
            map_url="https://osu.ppy.sh/beatmaps/0",
            map_name="TBD",
            difficulty_name="TBD",
            mapper_name="TBD"
        )
        db.add(default_map)
        db.commit()

    # Create Winner Bracket
    winner_bracket = Bracket(
        bracket_size=bracket_size,
        bracket_name="Winner Bracket",
        bracket_type="winner",
        bracket_order=1
    )
    db.add(winner_bracket)

    # Create Loser Bracket
    loser_bracket = Bracket(
        bracket_size=bracket_size,
        bracket_name="Loser Bracket",
        bracket_type="loser",
        bracket_order=2
    )
    db.add(loser_bracket)

    # Create Grand Finals
    gf_bracket = Bracket(
        bracket_size=2,
        bracket_name="Grand Finals",
        bracket_type="grandfinals",
        bracket_order=3
    )
    db.add(gf_bracket)
    db.commit()

    # Generate seeding matchups (1v32, 2v31, etc. or standard bracket seeding)
    def get_seeded_matchups(num_players):
        """Generate standard tournament seeding matchups."""
        if num_players <= 1:
            return []

        # Standard seeding: 1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15 for 16 players
        matchups = []
        half = num_players // 2
        for i in range(half):
            seed1 = i
            seed2 = num_players - 1 - i
            matchups.append((seed1, seed2))
        return matchups

    # ===== WINNER BRACKET =====
    num_winner_rounds = int(math.log2(bracket_size))
    placeholder = players[0]

    # Generate seeded matchups for Round 1
    matchups = get_seeded_matchups(bracket_size)

    # Store all winner rounds for linking to loser bracket
    winner_rounds = []  # winner_rounds[i] = list of matches in round i

    # WR1: First round with seeded players
    wr1 = []
    for seed1_idx, seed2_idx in matchups:
        p1 = players[seed1_idx] if seed1_idx < len(players) else placeholder
        p2 = players[seed2_idx] if seed2_idx < len(players) else placeholder

        match = Match(
            bracket_id=winner_bracket.id,
            player1_id=p1.id,
            player2_id=p2.id,
            map_id=default_map.id,
            round_name=f"Round of {bracket_size}",
            match_status="scheduled"
        )
        db.add(match)
        wr1.append(match)
    db.commit()
    winner_rounds.append(wr1)

    # Subsequent winner rounds
    for round_idx in range(1, num_winner_rounds):
        prev_round = winner_rounds[-1]
        matches_in_round = len(prev_round) // 2

        round_name = ("Winner Finals" if matches_in_round == 1 else
                      "Winner Semifinals" if matches_in_round == 2 else
                      "Winner Quarterfinals" if matches_in_round == 4 else
                      f"Winner Round {round_idx + 1}")

        curr_round = []
        for _ in range(matches_in_round):
            match = Match(
                bracket_id=winner_bracket.id,
                player1_id=placeholder.id,
                player2_id=placeholder.id,
                map_id=default_map.id,
                round_name=round_name,
                match_status="scheduled"
            )
            db.add(match)
            curr_round.append(match)
        db.commit()

        # Link previous round winners to this round
        for i, prev_match in enumerate(prev_round):
            prev_match.next_match_id = curr_round[i // 2].id
        db.commit()

        winner_rounds.append(curr_round)

    # ===== LOSER BRACKET =====
    # Structure: LR1 (consolidation), then alternating merge/consolidation rounds
    # For 8 players: LR1(2), LR2(2), LR3(1), LR4(1) = 6 matches
    # For 16 players: LR1(4), LR2(4), LR3(2), LR4(2), LR5(1), LR6(1) = 14 matches

    loser_rounds = []

    # LR1: WR1 losers paired together (consolidation)
    wr1 = winner_rounds[0]
    lr1_count = len(wr1) // 2
    lr1 = []
    for i in range(lr1_count):
        match = Match(
            bracket_id=loser_bracket.id,
            player1_id=placeholder.id,
            player2_id=placeholder.id,
            map_id=default_map.id,
            round_name="Loser Round 1",
            match_status="scheduled"
        )
        db.add(match)
        lr1.append(match)
    db.commit()

    # Link WR1 losers to LR1 (2:1 mapping - two WR1 losers per LR1 match)
    for i, wr_match in enumerate(wr1):
        wr_match.loser_next_match_id = lr1[i // 2].id
    db.commit()
    loser_rounds.append(lr1)

    # Process remaining winner rounds - each creates a merge round, possibly followed by consolidation
    for wr_idx in range(1, num_winner_rounds):
        wr = winner_rounds[wr_idx]
        prev_lr = loser_rounds[-1]
        is_winner_finals = (wr_idx == num_winner_rounds - 1)

        # Merge round: Previous LR survivors meet current WR losers
        merge_count = len(prev_lr)  # Should equal len(wr)
        loser_round_num = len(loser_rounds) + 1

        if is_winner_finals:
            round_name = "Loser Finals"
        else:
            round_name = f"Loser Round {loser_round_num}"

        merge_round = []
        for _ in range(merge_count):
            match = Match(
                bracket_id=loser_bracket.id,
                player1_id=placeholder.id,
                player2_id=placeholder.id,
                map_id=default_map.id,
                round_name=round_name,
                match_status="scheduled"
            )
            db.add(match)
            merge_round.append(match)
        db.commit()

        # Link previous LR winners to merge round (1:1)
        for i, prev_match in enumerate(prev_lr):
            prev_match.next_match_id = merge_round[i].id

        # Link current WR losers to merge round (1:1)
        for i, wr_match in enumerate(wr):
            if i < len(merge_round):
                wr_match.loser_next_match_id = merge_round[i].id
        db.commit()

        loser_rounds.append(merge_round)

        # Consolidation round after merge (if not loser finals and more than 1 match)
        if not is_winner_finals and merge_count > 1:
            consol_count = merge_count // 2
            loser_round_num = len(loser_rounds) + 1

            consol_round = []
            for _ in range(consol_count):
                match = Match(
                    bracket_id=loser_bracket.id,
                    player1_id=placeholder.id,
                    player2_id=placeholder.id,
                    map_id=default_map.id,
                    round_name=f"Loser Round {loser_round_num}",
                    match_status="scheduled"
                )
                db.add(match)
                consol_round.append(match)
            db.commit()

            # Link merge round winners to consolidation (2:1)
            for i, merge_match in enumerate(merge_round):
                merge_match.next_match_id = consol_round[i // 2].id
            db.commit()

            loser_rounds.append(consol_round)

    # ===== GRAND FINALS =====
    gf_match = Match(
        bracket_id=gf_bracket.id,
        player1_id=placeholder.id,
        player2_id=placeholder.id,
        map_id=default_map.id,
        round_name="Grand Finals",
        match_status="scheduled"
    )
    db.add(gf_match)
    db.commit()

    # Link Winner Finals winner to Grand Finals
    winner_rounds[-1][0].next_match_id = gf_match.id

    # Link Loser Finals winner to Grand Finals
    loser_rounds[-1][0].next_match_id = gf_match.id
    db.commit()

    total_matches = db.query(Match).count()

    logger.info(f"[BRACKET] Generated {total_matches} matches for {len(players)} players")

    return {
        "message": "Brackets generated successfully",
        "bracket_size": bracket_size,
        "players_seeded": len(players),
        "total_matches": total_matches,
        "brackets": {
            "winner": winner_bracket.id,
            "loser": loser_bracket.id,
            "grandfinals": gf_bracket.id
        }
    }


@router.patch("/admin/match/{match_id}/score")
async def admin_update_score(
    match_id: int,
    player1_score: int,
    player2_score: int,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_password)
):
    """Admin endpoint to set match score and determine winner."""
    from services.bracket_progression import BracketProgressionService

    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match.player1_score = player1_score
    match.player2_score = player2_score
    match.winner_id = match.player1_id if player1_score > player2_score else match.player2_id
    match.is_completed = True
    match.match_status = "completed"
    db.commit()

    # Progress bracket
    try:
        progression_service = BracketProgressionService(db)
        progression_result = progression_service.progress_match(match)
    except Exception as e:
        progression_result = {"error": str(e)}

    return {
        "match_id": match.id,
        "player1_score": player1_score,
        "player2_score": player2_score,
        "winner_id": match.winner_id,
        "progression": progression_result
    }


@router.get("/admin/matches")
async def admin_get_all_matches(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_password)
):
    """Get all matches with player details for admin."""
    matches = db.query(Match).order_by(Match.bracket_id, Match.id).all()

    result = []
    for match in matches:
        player1 = db.query(User).filter(User.id == match.player1_id).first()
        player2 = db.query(User).filter(User.id == match.player2_id).first()
        bracket = db.query(Bracket).filter(Bracket.id == match.bracket_id).first()

        result.append({
            "id": match.id,
            "bracket_id": match.bracket_id,
            "bracket_name": bracket.bracket_name if bracket else None,
            "bracket_type": bracket.bracket_type if bracket else None,
            "round_name": match.round_name,
            "player1": {"id": player1.id, "username": player1.username} if player1 else None,
            "player2": {"id": player2.id, "username": player2.username} if player2 else None,
            "player1_score": match.player1_score,
            "player2_score": match.player2_score,
            "winner_id": match.winner_id,
            "is_completed": match.is_completed,
            "match_status": match.match_status
        })

    return {"matches": result, "total": len(result)}
