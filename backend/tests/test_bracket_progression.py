"""Tests for BracketProgressionService."""
import pytest
from sqlalchemy.orm import Session

from models.bracket import Bracket
from models.match import Match
from models.map import Map
from models.user import User
from services.bracket_progression import BracketProgressionService


class TestAssignPlayerToMatch:
    """Tests for _assign_player_to_match (unit tests with in-memory objects)."""

    def test_assign_to_empty_player1(self, db: Session):
        """Assigns to player1 slot when it's empty (None)."""
        service = BracketProgressionService(db)
        match = Match()
        match.player1_id = None
        match.player2_id = None

        service._assign_player_to_match(match, 42)
        assert match.player1_id == 42

    def test_assign_to_empty_player2(self, db: Session):
        """Assigns to player2 slot when player1 is filled."""
        service = BracketProgressionService(db)
        match = Match()
        match.player1_id = 10
        match.player2_id = None

        service._assign_player_to_match(match, 42)
        assert match.player2_id == 42
        assert match.player1_id == 10  # Unchanged

    def test_assign_raises_when_both_filled(self, db: Session):
        """Raises ValueError when both player slots are occupied."""
        service = BracketProgressionService(db)
        match = Match()
        match.id = 99
        match.player1_id = 10
        match.player2_id = 20

        with pytest.raises(ValueError, match="already has both players"):
            service._assign_player_to_match(match, 42)

    def test_assign_player1_zero_treated_as_empty(self, db: Session):
        """Player ID of 0 is treated as empty (falsy)."""
        service = BracketProgressionService(db)
        match = Match()
        match.player1_id = 0
        match.player2_id = 5

        service._assign_player_to_match(match, 42)
        assert match.player1_id == 42


class TestIsGrandfinalsMatch:
    """Tests for _is_grandfinals_match."""

    def test_grandfinals_bracket_non_reset(self, db: Session, gf_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Returns True for GF bracket match that is not a reset."""
        service = BracketProgressionService(db)
        match = Match(
            bracket_id=gf_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            match_status="completed",
            is_grandfinals_reset=False,
        )
        db.add(match)
        db.commit()

        assert service._is_grandfinals_match(match) is True

    def test_grandfinals_bracket_reset_match(self, db: Session, gf_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Returns False for a reset match in GF bracket."""
        service = BracketProgressionService(db)
        match = Match(
            bracket_id=gf_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            match_status="completed",
            is_grandfinals_reset=True,
        )
        db.add(match)
        db.commit()

        assert service._is_grandfinals_match(match) is False

    def test_winner_bracket_match(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Returns False for winner bracket match."""
        service = BracketProgressionService(db)
        match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            match_status="completed",
            is_grandfinals_reset=False,
        )
        db.add(match)
        db.commit()

        assert service._is_grandfinals_match(match) is False

    def test_loser_bracket_match(self, db: Session, loser_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Returns False for loser bracket match."""
        service = BracketProgressionService(db)
        match = Match(
            bracket_id=loser_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            match_status="completed",
            is_grandfinals_reset=False,
        )
        db.add(match)
        db.commit()

        assert service._is_grandfinals_match(match) is False

    def test_nonexistent_bracket(self, db: Session):
        """Returns False when bracket doesn't exist."""
        service = BracketProgressionService(db)
        match = Match()
        match.bracket_id = 9999
        match.is_grandfinals_reset = False

        assert service._is_grandfinals_match(match) is False


class TestDidLoserBracketChampionWin:
    """Tests for _did_loser_bracket_champion_win."""

    def test_always_returns_true(self, db: Session, gf_match_setup: Match):
        """Currently always returns True (known TODO)."""
        service = BracketProgressionService(db)
        result = service._did_loser_bracket_champion_win(gf_match_setup)
        assert result is True


class TestCreateBracketResetMatch:
    """Tests for _create_bracket_reset_match."""

    def test_creates_reset_match(self, db: Session, gf_bracket: Bracket, gf_match_setup: Match):
        """Creates a bracket reset match with correct attributes."""
        service = BracketProgressionService(db)
        reset_match = service._create_bracket_reset_match(gf_match_setup)

        assert reset_match.id is not None
        assert reset_match.bracket_id == gf_bracket.id
        assert reset_match.player1_id == gf_match_setup.player1_id
        assert reset_match.player2_id == gf_match_setup.player2_id
        assert reset_match.map_id == gf_match_setup.map_id
        assert reset_match.round_name == "Grand Finals Reset"
        assert reset_match.is_grandfinals_reset is True
        assert reset_match.match_status == "scheduled"

    def test_reset_match_same_players(self, db: Session, gf_bracket: Bracket, gf_match_setup: Match):
        """Reset match has same players as original GF match."""
        service = BracketProgressionService(db)
        reset_match = service._create_bracket_reset_match(gf_match_setup)

        assert reset_match.player1_id == gf_match_setup.player1_id
        assert reset_match.player2_id == gf_match_setup.player2_id

    def test_reset_match_raises_without_gf_bracket(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Raises ValueError when no grandfinals bracket exists."""
        service = BracketProgressionService(db)
        match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            match_status="completed",
        )
        db.add(match)
        db.commit()

        with pytest.raises(ValueError, match="Grand Finals bracket not found"):
            service._create_bracket_reset_match(match)


class TestProgressMatch:
    """Tests for progress_match (main method)."""

    def test_raises_if_not_completed(self, db: Session, sample_match: Match):
        """Raises ValueError if match is not completed."""
        service = BracketProgressionService(db)
        with pytest.raises(ValueError, match="must be completed"):
            service.progress_match(sample_match)

    def test_raises_if_no_winner(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Raises ValueError if match has no winner_id."""
        match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            match_status="completed",
            is_completed=True,
            winner_id=None,
        )
        db.add(match)
        db.commit()

        service = BracketProgressionService(db)
        with pytest.raises(ValueError, match="must be completed with a winner"):
            service.progress_match(match)

    def test_no_progression_when_no_links(self, db: Session, completed_match: Match):
        """Returns None for advancement when match has no next_match_id."""
        service = BracketProgressionService(db)
        result = service.progress_match(completed_match)

        assert result["winner_advanced_to"] is None
        assert result["loser_advanced_to"] is None
        assert result["grandfinals_reset_created"] is False

    def test_winner_advances_to_next_match(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Winner is assigned to next_match when slot is available."""
        # Create destination match with empty player2 slot (0 = empty sentinel)
        next_match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[2].id,
            player2_id=0,
            map_id=default_map.id,
            round_name="Semifinals",
            match_status="scheduled",
        )
        db.add(next_match)
        db.flush()

        # Create source match linking to destination
        source_match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            round_name="Round of 8",
            match_status="completed",
            is_completed=True,
            winner_id=registered_players[0].id,
            next_match_id=next_match.id,
        )
        db.add(source_match)
        db.commit()

        service = BracketProgressionService(db)
        result = service.progress_match(source_match)

        assert result["winner_advanced_to"] == next_match.id
        db.refresh(next_match)
        assert next_match.player2_id == registered_players[0].id

    def test_loser_drops_to_loser_bracket(self, db: Session, winner_bracket: Bracket, loser_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Loser is assigned to loser_next_match when slot is available."""
        # Loser bracket destination (0 = empty sentinel)
        loser_dest = Match(
            bracket_id=loser_bracket.id,
            player1_id=0,
            player2_id=0,
            map_id=default_map.id,
            round_name="Loser Round 1",
            match_status="scheduled",
        )
        db.add(loser_dest)
        db.flush()

        # Winner bracket source
        source_match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            round_name="Round of 8",
            match_status="completed",
            is_completed=True,
            winner_id=registered_players[0].id,
            loser_next_match_id=loser_dest.id,
        )
        db.add(source_match)
        db.commit()

        service = BracketProgressionService(db)
        result = service.progress_match(source_match)

        assert result["loser_advanced_to"] == loser_dest.id
        db.refresh(loser_dest)
        # Loser is player2 (since winner is player1 who won)
        assert loser_dest.player1_id == registered_players[1].id

    def test_both_winner_and_loser_advance(self, db: Session, winner_bracket: Bracket, loser_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Both winner and loser advance when both links exist."""
        winner_dest = Match(
            bracket_id=winner_bracket.id,
            player1_id=0,
            player2_id=0,
            map_id=default_map.id,
            round_name="Semifinals",
            match_status="scheduled",
        )
        loser_dest = Match(
            bracket_id=loser_bracket.id,
            player1_id=0,
            player2_id=0,
            map_id=default_map.id,
            round_name="Loser Round 1",
            match_status="scheduled",
        )
        db.add_all([winner_dest, loser_dest])
        db.flush()

        source = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            match_status="completed",
            is_completed=True,
            winner_id=registered_players[0].id,
            next_match_id=winner_dest.id,
            loser_next_match_id=loser_dest.id,
        )
        db.add(source)
        db.commit()

        service = BracketProgressionService(db)
        result = service.progress_match(source)

        assert result["winner_advanced_to"] == winner_dest.id
        assert result["loser_advanced_to"] == loser_dest.id

        db.refresh(winner_dest)
        db.refresh(loser_dest)
        assert winner_dest.player1_id == registered_players[0].id
        assert loser_dest.player1_id == registered_players[1].id

    def test_grandfinals_creates_reset(self, db: Session, gf_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Grand Finals match triggers bracket reset creation."""
        gf_match = Match(
            bracket_id=gf_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            round_name="Grand Finals",
            match_status="completed",
            is_completed=True,
            winner_id=registered_players[1].id,
            is_grandfinals_reset=False,
        )
        db.add(gf_match)
        db.commit()

        service = BracketProgressionService(db)
        result = service.progress_match(gf_match)

        assert result["grandfinals_reset_created"] is True
        assert result["bracket_reset_match_id"] is not None

        # Verify reset match exists in DB
        reset_match = db.query(Match).filter(Match.id == result["bracket_reset_match_id"]).first()
        assert reset_match is not None
        assert reset_match.is_grandfinals_reset is True
        assert reset_match.bracket_id == gf_bracket.id
        assert reset_match.player1_id == registered_players[0].id
        assert reset_match.player2_id == registered_players[1].id

    def test_reset_match_no_further_reset(self, db: Session, gf_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """A reset match does NOT trigger another reset."""
        reset_match = Match(
            bracket_id=gf_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            round_name="Grand Finals Reset",
            match_status="completed",
            is_completed=True,
            winner_id=registered_players[0].id,
            is_grandfinals_reset=True,
        )
        db.add(reset_match)
        db.commit()

        service = BracketProgressionService(db)
        result = service.progress_match(reset_match)

        assert result["grandfinals_reset_created"] is False

    def test_loser_id_determined_correctly_player1_wins(self, db: Session, winner_bracket: Bracket, loser_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """When player1 wins, player2 is the loser."""
        loser_dest = Match(
            bracket_id=loser_bracket.id,
            player1_id=0,
            player2_id=0,
            map_id=default_map.id,
            match_status="scheduled",
        )
        db.add(loser_dest)
        db.flush()

        source = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            match_status="completed",
            is_completed=True,
            winner_id=registered_players[0].id,  # Player1 wins
            loser_next_match_id=loser_dest.id,
        )
        db.add(source)
        db.commit()

        service = BracketProgressionService(db)
        service.progress_match(source)

        db.refresh(loser_dest)
        assert loser_dest.player1_id == registered_players[1].id  # Player2 is the loser

    def test_loser_id_determined_correctly_player2_wins(self, db: Session, winner_bracket: Bracket, loser_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """When player2 wins, player1 is the loser."""
        loser_dest = Match(
            bracket_id=loser_bracket.id,
            player1_id=0,
            player2_id=0,
            map_id=default_map.id,
            match_status="scheduled",
        )
        db.add(loser_dest)
        db.flush()

        source = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            match_status="completed",
            is_completed=True,
            winner_id=registered_players[1].id,  # Player2 wins
            loser_next_match_id=loser_dest.id,
        )
        db.add(source)
        db.commit()

        service = BracketProgressionService(db)
        service.progress_match(source)

        db.refresh(loser_dest)
        assert loser_dest.player1_id == registered_players[0].id  # Player1 is the loser

    def test_nonexistent_next_match_ignored(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """If next_match_id points to non-existent match, progression is skipped gracefully."""
        source = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            match_status="completed",
            is_completed=True,
            winner_id=registered_players[0].id,
            next_match_id=99999,
        )
        db.add(source)
        db.commit()

        service = BracketProgressionService(db)
        result = service.progress_match(source)

        assert result["winner_advanced_to"] is None

    def test_assign_raises_when_destination_full(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Raises ValueError when destination match has both slots filled."""
        # Destination with both slots filled
        full_dest = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[2].id,
            player2_id=registered_players[3].id,
            map_id=default_map.id,
            match_status="scheduled",
        )
        db.add(full_dest)
        db.flush()

        source = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            match_status="completed",
            is_completed=True,
            winner_id=registered_players[0].id,
            next_match_id=full_dest.id,
        )
        db.add(source)
        db.commit()

        service = BracketProgressionService(db)
        with pytest.raises(ValueError, match="already has both players"):
            service.progress_match(source)


class TestProgressMatchIntegration:
    """Integration tests: full bracket progression flows."""

    def test_two_matches_feed_into_semifinals(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Two completed R1 matches feed winners into a single semifinals match."""
        # Semifinals destination (0 = empty sentinel)
        semis = Match(
            bracket_id=winner_bracket.id,
            player1_id=0,
            player2_id=0,
            map_id=default_map.id,
            round_name="Semifinals",
            match_status="scheduled",
        )
        db.add(semis)
        db.flush()

        # Two R1 matches pointing to same semifinals
        r1_a = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[7].id,
            map_id=default_map.id,
            round_name="Round of 8",
            match_status="completed",
            is_completed=True,
            winner_id=registered_players[0].id,
            next_match_id=semis.id,
        )
        r1_b = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[3].id,
            player2_id=registered_players[4].id,
            map_id=default_map.id,
            round_name="Round of 8",
            match_status="completed",
            is_completed=True,
            winner_id=registered_players[4].id,
            next_match_id=semis.id,
        )
        db.add_all([r1_a, r1_b])
        db.commit()

        service = BracketProgressionService(db)

        # Progress first match
        result1 = service.progress_match(r1_a)
        assert result1["winner_advanced_to"] == semis.id
        db.refresh(semis)
        assert semis.player1_id == registered_players[0].id

        # Progress second match
        result2 = service.progress_match(r1_b)
        assert result2["winner_advanced_to"] == semis.id
        db.refresh(semis)
        assert semis.player2_id == registered_players[4].id

    def test_winner_bracket_to_loser_bracket_flow(self, db: Session, winner_bracket: Bracket, loser_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Winner advances in winners, loser drops to losers."""
        winner_dest = Match(
            bracket_id=winner_bracket.id,
            player1_id=0,
            player2_id=0,
            map_id=default_map.id,
            round_name="Winner Semifinals",
            match_status="scheduled",
        )
        loser_dest = Match(
            bracket_id=loser_bracket.id,
            player1_id=0,
            player2_id=0,
            map_id=default_map.id,
            round_name="Loser Round 1",
            match_status="scheduled",
        )
        db.add_all([winner_dest, loser_dest])
        db.flush()

        source = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[7].id,
            map_id=default_map.id,
            round_name="Round of 8",
            match_status="completed",
            is_completed=True,
            winner_id=registered_players[0].id,
            next_match_id=winner_dest.id,
            loser_next_match_id=loser_dest.id,
        )
        db.add(source)
        db.commit()

        service = BracketProgressionService(db)
        result = service.progress_match(source)

        db.refresh(winner_dest)
        db.refresh(loser_dest)

        # Winner (player 0) goes to winner bracket
        assert winner_dest.player1_id == registered_players[0].id
        # Loser (player 7) goes to loser bracket
        assert loser_dest.player1_id == registered_players[7].id

    def test_full_grandfinals_flow(self, db: Session, gf_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """GF Game 1 → bracket reset → Game 2 (no further reset)."""
        service = BracketProgressionService(db)

        # Grand Finals Game 1
        gf1 = Match(
            bracket_id=gf_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            round_name="Grand Finals",
            match_status="completed",
            is_completed=True,
            winner_id=registered_players[1].id,  # Loser bracket champ wins
            is_grandfinals_reset=False,
        )
        db.add(gf1)
        db.commit()

        # Progress GF1 → creates reset
        result1 = service.progress_match(gf1)
        assert result1["grandfinals_reset_created"] is True
        reset_id = result1["bracket_reset_match_id"]

        # Simulate reset match completion
        reset_match = db.query(Match).filter(Match.id == reset_id).first()
        assert reset_match.is_grandfinals_reset is True
        reset_match.match_status = "completed"
        reset_match.is_completed = True
        reset_match.winner_id = registered_players[0].id
        reset_match.player1_score = 600000
        reset_match.player2_score = 550000
        db.commit()

        # Progress reset match → no further reset
        result2 = service.progress_match(reset_match)
        assert result2["grandfinals_reset_created"] is False
        assert result2["winner_advanced_to"] is None
