"""
Endpoints de gestión de llaves
"""
import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from utils.auth import get_current_staff_user
from utils.database import get_db
from models.bracket import Bracket
from models.match import Match
from models.user import User
from models.map import Map

router = APIRouter(prefix="/brackets", tags=["Brackets"])


class GenerateBracketsRequest(BaseModel):
    """Request body for generating brackets."""
    bracket_size: int = 8


@router.get("")
async def get_all_brackets(db: Session = Depends(get_db)):
    """Obtener todas las llaves con estadísticas de partidas"""
    brackets = db.query(Bracket).order_by(Bracket.bracket_order).all()

    result = []
    for bracket in brackets:
        total_matches = db.query(Match).filter(Match.bracket_id == bracket.id).count()
        completed_matches = db.query(Match).filter(
            Match.bracket_id == bracket.id,
            Match.is_completed.is_(True)
        ).count()

        result.append({
            "id": bracket.id,
            "bracket_size": bracket.bracket_size,
            "bracket_name": bracket.bracket_name,
            "bracket_type": bracket.bracket_type,
            "bracket_order": bracket.bracket_order,
            "is_completed": bracket.is_completed,
            "total_matches": total_matches,
            "completed_matches": completed_matches
        })

    return {"brackets": result}


@router.post("/generate")
async def generate_brackets(
    request: GenerateBracketsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """
    Generate full double elimination bracket structure (staff only).

    Creates winner bracket, loser bracket, and grand finals with registered players.
    """
    # Get registered players ordered by seed
    players = db.query(User).filter(
        User.is_registered.is_(True)
    ).order_by(User.seed_number.asc().nullslast()).all()

    if len(players) < 2:
        raise HTTPException(status_code=400, detail="Se necesitan al menos 2 jugadores registrados")

    bracket_size = request.bracket_size
    if bracket_size not in [4, 8, 16, 32]:
        raise HTTPException(status_code=400, detail="El tamaño debe ser 4, 8, 16 o 32")

    if len(players) > bracket_size:
        players = players[:bracket_size]

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
        db.refresh(default_map)

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

    # Generate seeded matchups
    def get_seeded_matchups(num_players):
        matchups = []
        half = num_players // 2
        for i in range(half):
            seed1 = i
            seed2 = num_players - 1 - i
            matchups.append((seed1, seed2))
        return matchups

    num_winner_rounds = int(math.log2(bracket_size))
    placeholder = players[0]
    matchups = get_seeded_matchups(bracket_size)
    winner_rounds = []

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

        for i, prev_match in enumerate(prev_round):
            prev_match.next_match_id = curr_round[i // 2].id
        db.commit()
        winner_rounds.append(curr_round)

    # Grand Finals match
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

    # Link Winner Finals to Grand Finals
    if winner_rounds:
        winner_finals = winner_rounds[-1][0]
        winner_finals.next_match_id = gf_match.id
        db.commit()

    return {
        "message": "Brackets generados exitosamente",
        "brackets": {
            "winner": winner_bracket.id,
            "loser": loser_bracket.id,
            "grandfinals": gf_bracket.id
        },
        "players_seeded": len(players)
    }


@router.post("")
async def create_bracket(
    bracket_size: int,
    bracket_name: str,
    bracket_order: int,
    bracket_type: str = "winner",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Crear estructura de llave (solo staff)"""
    bracket = Bracket(
        bracket_size=bracket_size,
        bracket_name=bracket_name,
        bracket_order=bracket_order,
        bracket_type=bracket_type
    )
    db.add(bracket)
    db.commit()
    db.refresh(bracket)
    return bracket


@router.get("/{bracket_id}")
async def get_bracket(bracket_id: int, db: Session = Depends(get_db)):
    """Obtener detalles de una llave específica"""
    bracket = db.query(Bracket).filter(Bracket.id == bracket_id).first()
    if not bracket:
        raise HTTPException(status_code=404, detail="Bracket not found")
    return bracket


@router.get("/{bracket_id}/matches")
async def get_bracket_matches(bracket_id: int, db: Session = Depends(get_db)):
    """Obtener todas las partidas de una llave con detalles de jugadores"""
    bracket = db.query(Bracket).filter(Bracket.id == bracket_id).first()
    if not bracket:
        raise HTTPException(status_code=404, detail="Bracket not found")

    matches = db.query(Match).filter(Match.bracket_id == bracket_id).order_by(Match.id).all()

    result = []
    for match in matches:
        player1 = db.query(User).filter(User.id == match.player1_id).first()
        player2 = db.query(User).filter(User.id == match.player2_id).first()
        winner = db.query(User).filter(User.id == match.winner_id).first() if match.winner_id else None

        result.append({
            "id": match.id,
            "bracket_id": match.bracket_id,
            "player1_id": match.player1_id,
            "player1_username": player1.username if player1 else "TBD",
            "player2_id": match.player2_id,
            "player2_username": player2.username if player2 else "TBD",
            "player1_score": match.player1_score,
            "player2_score": match.player2_score,
            "winner_id": match.winner_id,
            "winner_username": winner.username if winner else None,
            "match_status": match.match_status,
            "is_completed": match.is_completed,
            "scheduled_time": match.scheduled_time,
            "round_name": match.round_name,
            "next_match_id": match.next_match_id,
            "loser_next_match_id": match.loser_next_match_id,
            "is_grandfinals_reset": match.is_grandfinals_reset
        })

    return {"matches": result, "total": len(result), "bracket": {"id": bracket.id, "name": bracket.bracket_name, "size": bracket.bracket_size, "type": bracket.bracket_type}}
