"""Tests for bracket API endpoints."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from models.bracket import Bracket
from models.match import Match
from models.map import Map
from models.user import User


class TestGetAllBrackets:
    """Tests for GET /brackets."""

    def test_get_brackets_empty(self, public_client: TestClient):
        """Returns empty list when no brackets exist."""
        resp = public_client.get("/brackets")
        assert resp.status_code == 200
        data = resp.json()
        assert data["brackets"] == []

    def test_get_brackets_with_data(self, public_client: TestClient, winner_bracket: Bracket):
        """Returns brackets with match statistics."""
        resp = public_client.get("/brackets")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["brackets"]) == 1
        b = data["brackets"][0]
        assert b["bracket_name"] == "Winner Bracket"
        assert b["bracket_type"] == "winner"
        assert b["bracket_size"] == 8
        assert b["bracket_order"] == 1
        assert b["is_completed"] is False
        assert b["total_matches"] == 0
        assert b["completed_matches"] == 0

    def test_get_brackets_match_stats(self, public_client: TestClient, sample_match: Match, completed_match: Match, winner_bracket: Bracket):
        """Match statistics (total/completed) are accurate."""
        resp = public_client.get("/brackets")
        data = resp.json()
        b = data["brackets"][0]
        assert b["total_matches"] == 2
        assert b["completed_matches"] == 1

    def test_get_brackets_ordered_by_bracket_order(self, public_client: TestClient, all_brackets):
        """Brackets are returned ordered by bracket_order."""
        resp = public_client.get("/brackets")
        data = resp.json()
        orders = [b["bracket_order"] for b in data["brackets"]]
        assert orders == sorted(orders)

    def test_get_brackets_multiple_types(self, public_client: TestClient, all_brackets):
        """Returns winner, loser, and grandfinals brackets."""
        resp = public_client.get("/brackets")
        data = resp.json()
        types = {b["bracket_type"] for b in data["brackets"]}
        assert types == {"winner", "loser", "grandfinals"}


class TestGetBracket:
    """Tests for GET /brackets/{bracket_id}."""

    def test_get_bracket_found(self, public_client: TestClient, winner_bracket: Bracket):
        """Returns bracket when it exists."""
        resp = public_client.get(f"/brackets/{winner_bracket.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["bracket_name"] == "Winner Bracket"
        assert data["bracket_type"] == "winner"

    def test_get_bracket_not_found(self, public_client: TestClient):
        """Returns 404 for non-existent bracket."""
        resp = public_client.get("/brackets/9999")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


class TestGetBracketMatches:
    """Tests for GET /brackets/{bracket_id}/matches."""

    def test_get_matches_empty_bracket(self, public_client: TestClient, winner_bracket: Bracket):
        """Returns empty match list for bracket with no matches."""
        resp = public_client.get(f"/brackets/{winner_bracket.id}/matches")
        assert resp.status_code == 200
        data = resp.json()
        assert data["matches"] == []
        assert data["total"] == 0
        assert data["bracket"]["id"] == winner_bracket.id

    def test_get_matches_with_data(self, public_client: TestClient, sample_match: Match, winner_bracket: Bracket, registered_players: list[User]):
        """Returns matches with player usernames."""
        resp = public_client.get(f"/brackets/{winner_bracket.id}/matches")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        m = data["matches"][0]
        assert m["player1_username"] == registered_players[0].username
        assert m["player2_username"] == registered_players[7].username
        assert m["match_status"] == "scheduled"
        assert m["is_completed"] is False

    def test_get_matches_completed(self, public_client: TestClient, completed_match: Match, winner_bracket: Bracket, registered_players: list[User]):
        """Completed match shows scores and winner."""
        resp = public_client.get(f"/brackets/{winner_bracket.id}/matches")
        data = resp.json()
        m = data["matches"][0]
        assert m["player1_score"] == 500000
        assert m["player2_score"] == 400000
        assert m["winner_id"] == registered_players[0].id
        assert m["is_completed"] is True

    def test_get_matches_includes_links(self, public_client: TestClient, match_chain, winner_bracket: Bracket):
        """Match response includes next_match_id and loser_next_match_id."""
        resp = public_client.get(f"/brackets/{winner_bracket.id}/matches")
        data = resp.json()
        # Find the WR1 match (has both links)
        wr1 = next(m for m in data["matches"] if m["round_name"] == "Round of 8")
        assert wr1["next_match_id"] == match_chain["wr2"].id
        assert wr1["loser_next_match_id"] == match_chain["lr1"].id

    def test_get_matches_bracket_not_found(self, public_client: TestClient):
        """Returns 404 for non-existent bracket."""
        resp = public_client.get("/brackets/9999/matches")
        assert resp.status_code == 404

    def test_get_matches_bracket_metadata(self, public_client: TestClient, winner_bracket: Bracket):
        """Response includes bracket metadata."""
        resp = public_client.get(f"/brackets/{winner_bracket.id}/matches")
        data = resp.json()
        assert data["bracket"]["name"] == "Winner Bracket"
        assert data["bracket"]["size"] == 8
        assert data["bracket"]["type"] == "winner"

    def test_get_matches_grandfinals_reset_flag(self, public_client: TestClient, gf_match_setup: Match, gf_bracket: Bracket):
        """Grand finals match shows is_grandfinals_reset flag."""
        resp = public_client.get(f"/brackets/{gf_bracket.id}/matches")
        data = resp.json()
        m = data["matches"][0]
        assert m["is_grandfinals_reset"] is False


class TestCreateBracket:
    """Tests for POST /brackets."""

    def test_create_bracket_staff(self, client: TestClient):
        """Staff can create a bracket."""
        resp = client.post(
            "/brackets",
            params={
                "bracket_size": 16,
                "bracket_name": "Custom Bracket",
                "bracket_order": 50,
                "bracket_type": "winner",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["bracket_size"] == 16
        assert data["bracket_name"] == "Custom Bracket"
        assert data["bracket_order"] == 50
        assert data["bracket_type"] == "winner"

    def test_create_bracket_default_type(self, client: TestClient):
        """Default bracket_type is 'winner'."""
        resp = client.post(
            "/brackets",
            params={
                "bracket_size": 8,
                "bracket_name": "Default Type",
                "bracket_order": 51,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["bracket_type"] == "winner"

    def test_create_bracket_loser_type(self, client: TestClient):
        """Can create loser bracket type."""
        resp = client.post(
            "/brackets",
            params={
                "bracket_size": 8,
                "bracket_name": "Loser",
                "bracket_order": 52,
                "bracket_type": "loser",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["bracket_type"] == "loser"


class TestGenerateBrackets:
    """Tests for POST /brackets/generate."""

    def test_generate_brackets_success(self, client: TestClient, db: Session, registered_players: list[User], default_map: Map):
        """Generates winner, loser, and grand finals brackets with 8 players."""
        resp = client.post("/brackets/generate", json={"bracket_size": 8})
        assert resp.status_code == 200
        data = resp.json()

        assert "brackets" in data
        assert "winner" in data["brackets"]
        assert "loser" in data["brackets"]
        assert "grandfinals" in data["brackets"]
        assert data["players_seeded"] == 8

    def test_generate_brackets_creates_three_brackets(self, client: TestClient, db: Session, registered_players: list[User], default_map: Map):
        """Generates exactly 3 brackets."""
        client.post("/brackets/generate", json={"bracket_size": 8})
        brackets = db.query(Bracket).all()
        assert len(brackets) == 3

        types = {b.bracket_type for b in brackets}
        assert types == {"winner", "loser", "grandfinals"}

    def test_generate_brackets_creates_matches(self, client: TestClient, db: Session, registered_players: list[User], default_map: Map):
        """Generates matches in the winner bracket."""
        client.post("/brackets/generate", json={"bracket_size": 8})
        matches = db.query(Match).all()
        # 8-player bracket: 4 (R1) + 2 (R2) + 1 (Finals) + 1 (GF) = 8 matches
        assert len(matches) >= 4  # At least first round matches

    def test_generate_brackets_seeding_order(self, client: TestClient, db: Session, registered_players: list[User], default_map: Map):
        """First round matches follow seeding: 1v8, 2v7, 3v6, 4v5."""
        client.post("/brackets/generate", json={"bracket_size": 8})

        winner_bracket = db.query(Bracket).filter(Bracket.bracket_type == "winner").first()
        r1_matches = db.query(Match).filter(
            Match.bracket_id == winner_bracket.id,
            Match.round_name == "Round of 8",
        ).all()

        assert len(r1_matches) == 4

        # Check seed 1 vs seed 8
        player_pairs = {(m.player1_id, m.player2_id) for m in r1_matches}
        expected_pair = (registered_players[0].id, registered_players[7].id)
        assert expected_pair in player_pairs

    def test_generate_brackets_match_linking(self, client: TestClient, db: Session, registered_players: list[User], default_map: Map):
        """First round matches have next_match_id set."""
        client.post("/brackets/generate", json={"bracket_size": 8})

        winner_bracket = db.query(Bracket).filter(Bracket.bracket_type == "winner").first()
        r1_matches = db.query(Match).filter(
            Match.bracket_id == winner_bracket.id,
            Match.round_name == "Round of 8",
        ).all()

        for match in r1_matches:
            assert match.next_match_id is not None

    def test_generate_brackets_winner_finals_to_gf(self, client: TestClient, db: Session, registered_players: list[User], default_map: Map):
        """Winner Finals links to Grand Finals match."""
        client.post("/brackets/generate", json={"bracket_size": 8})

        winner_bracket = db.query(Bracket).filter(Bracket.bracket_type == "winner").first()
        gf_bracket = db.query(Bracket).filter(Bracket.bracket_type == "grandfinals").first()

        wf_match = db.query(Match).filter(
            Match.bracket_id == winner_bracket.id,
            Match.round_name == "Winner Finals",
        ).first()
        gf_match = db.query(Match).filter(Match.bracket_id == gf_bracket.id).first()

        assert wf_match is not None
        assert gf_match is not None
        assert wf_match.next_match_id == gf_match.id

    def test_generate_brackets_clears_existing(self, client: TestClient, db: Session, registered_players: list[User], default_map: Map):
        """Generating brackets clears all existing brackets and matches."""
        # Generate once
        client.post("/brackets/generate", json={"bracket_size": 8})
        first_count = db.query(Match).count()

        # Generate again
        client.post("/brackets/generate", json={"bracket_size": 8})
        second_count = db.query(Match).count()

        assert first_count == second_count  # Same number, not doubled

    def test_generate_brackets_invalid_size(self, client: TestClient, registered_players: list[User]):
        """Rejects invalid bracket sizes."""
        resp = client.post("/brackets/generate", json={"bracket_size": 5})
        assert resp.status_code == 400

        resp = client.post("/brackets/generate", json={"bracket_size": 64})
        assert resp.status_code == 400

    def test_generate_brackets_too_few_players(self, client: TestClient, db: Session):
        """Rejects generation with fewer than 2 registered players."""
        # Only one registered player
        user = User(osu_id=9999, username="Lonely", flag_code="PE", is_registered=True, seed_number=1)
        db.add(user)
        db.commit()

        resp = client.post("/brackets/generate", json={"bracket_size": 4})
        assert resp.status_code == 400

    def test_generate_brackets_fewer_players_than_size(self, client: TestClient, db: Session, four_players: list[User], default_map: Map):
        """Works when bracket_size > number of players (uses placeholder)."""
        resp = client.post("/brackets/generate", json={"bracket_size": 8})
        assert resp.status_code == 200
        # Should use first player as placeholder for missing slots
        assert resp.json()["players_seeded"] == 4

    def test_generate_brackets_size_4(self, client: TestClient, db: Session, four_players: list[User], default_map: Map):
        """Works with bracket_size=4."""
        resp = client.post("/brackets/generate", json={"bracket_size": 4})
        assert resp.status_code == 200
        data = resp.json()
        assert data["players_seeded"] == 4

        winner_bracket = db.query(Bracket).filter(Bracket.bracket_type == "winner").first()
        r1_matches = db.query(Match).filter(
            Match.bracket_id == winner_bracket.id,
            Match.round_name == "Round of 4",
        ).all()
        assert len(r1_matches) == 2

    def test_generate_brackets_round_names(self, client: TestClient, db: Session, registered_players: list[User], default_map: Map):
        """Generated matches have correct round names."""
        client.post("/brackets/generate", json={"bracket_size": 8})

        winner_bracket = db.query(Bracket).filter(Bracket.bracket_type == "winner").first()
        round_names = {m.round_name for m in db.query(Match).filter(Match.bracket_id == winner_bracket.id).all()}

        assert "Round of 8" in round_names
        assert "Winner Semifinals" in round_names or "Winner Round 2" in round_names
        assert "Winner Finals" in round_names

    def test_generate_brackets_gf_match_scheduled(self, client: TestClient, db: Session, registered_players: list[User], default_map: Map):
        """Grand Finals match is created with scheduled status."""
        client.post("/brackets/generate", json={"bracket_size": 8})

        gf_bracket = db.query(Bracket).filter(Bracket.bracket_type == "grandfinals").first()
        gf_match = db.query(Match).filter(Match.bracket_id == gf_bracket.id).first()

        assert gf_match is not None
        assert gf_match.match_status == "scheduled"
        assert gf_match.round_name == "Grand Finals"
        assert gf_match.is_grandfinals_reset is False
