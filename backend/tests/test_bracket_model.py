"""Tests for Bracket and Match models."""
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models.bracket import Bracket
from models.match import Match
from models.user import User
from models.map import Map


class TestBracketModel:
    """Tests for the Bracket model."""

    def test_create_bracket(self, db: Session):
        """Bracket can be created with required fields."""
        bracket = Bracket(
            bracket_size=8,
            bracket_name="Test Bracket",
            bracket_type="winner",
            bracket_order=10,
        )
        db.add(bracket)
        db.commit()
        db.refresh(bracket)

        assert bracket.id is not None
        assert bracket.bracket_size == 8
        assert bracket.bracket_name == "Test Bracket"
        assert bracket.bracket_type == "winner"
        assert bracket.bracket_order == 10
        assert bracket.is_completed is False

    def test_bracket_types(self, db: Session):
        """All three bracket types can be created."""
        types = [("winner", 11), ("loser", 12), ("grandfinals", 13)]
        for btype, order in types:
            bracket = Bracket(
                bracket_size=8,
                bracket_name=f"{btype} bracket",
                bracket_type=btype,
                bracket_order=order,
            )
            db.add(bracket)

        db.commit()
        assert db.query(Bracket).count() == 3

    def test_bracket_order_unique(self, db: Session):
        """bracket_order must be unique."""
        b1 = Bracket(bracket_size=8, bracket_name="B1", bracket_type="winner", bracket_order=20)
        b2 = Bracket(bracket_size=8, bracket_name="B2", bracket_type="loser", bracket_order=20)
        db.add(b1)
        db.commit()
        db.add(b2)
        with pytest.raises(IntegrityError):
            db.commit()

    def test_bracket_sizes(self, db: Session):
        """Valid bracket sizes: 2, 4, 8, 16, 32."""
        for i, size in enumerate([2, 4, 8, 16, 32]):
            b = Bracket(
                bracket_size=size,
                bracket_name=f"Size {size}",
                bracket_type="winner",
                bracket_order=30 + i,
            )
            db.add(b)
        db.commit()
        assert db.query(Bracket).filter(Bracket.bracket_order >= 30).count() == 5

    def test_bracket_is_completed_default(self, db: Session):
        """is_completed defaults to False."""
        bracket = Bracket(
            bracket_size=8,
            bracket_name="Default Test",
            bracket_type="winner",
            bracket_order=40,
        )
        db.add(bracket)
        db.commit()
        db.refresh(bracket)
        assert bracket.is_completed is False

    def test_bracket_repr(self, winner_bracket: Bracket):
        """__repr__ includes id, name, and size."""
        r = repr(winner_bracket)
        assert "Winner Bracket" in r
        assert "8" in r

    def test_bracket_matches_relationship(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Bracket has a matches relationship."""
        match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            round_name="Test Round",
            match_status="scheduled",
        )
        db.add(match)
        db.commit()
        db.refresh(winner_bracket)

        assert len(winner_bracket.matches) == 1
        assert winner_bracket.matches[0].round_name == "Test Round"

    def test_bracket_cascade_delete(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Deleting bracket cascades to its matches."""
        match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            round_name="Cascade Test",
            match_status="scheduled",
        )
        db.add(match)
        db.commit()

        assert db.query(Match).count() == 1
        db.delete(winner_bracket)
        db.commit()
        assert db.query(Match).count() == 0


class TestMatchModel:
    """Tests for the Match model."""

    def test_create_match(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Match can be created with required fields."""
        match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            round_name="Round of 8",
            match_status="scheduled",
        )
        db.add(match)
        db.commit()
        db.refresh(match)

        assert match.id is not None
        assert match.bracket_id == winner_bracket.id
        assert match.player1_id == registered_players[0].id
        assert match.player2_id == registered_players[1].id
        assert match.match_status == "scheduled"
        assert match.is_completed is False
        assert match.winner_id is None
        assert match.player1_score is None
        assert match.player2_score is None

    def test_match_statuses(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """All match statuses can be set."""
        statuses = ["scheduled", "in_progress", "completed", "cancelled", "forfeit"]
        for i, status in enumerate(statuses):
            match = Match(
                bracket_id=winner_bracket.id,
                player1_id=registered_players[0].id,
                player2_id=registered_players[1].id,
                map_id=default_map.id,
                match_status=status,
            )
            db.add(match)
        db.commit()
        assert db.query(Match).count() == 5

    def test_match_with_scores(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Match can store scores and winner."""
        match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            match_status="completed",
            is_completed=True,
            player1_score=999999,
            player2_score=888888,
            winner_id=registered_players[0].id,
        )
        db.add(match)
        db.commit()
        db.refresh(match)

        assert match.player1_score == 999999
        assert match.player2_score == 888888
        assert match.winner_id == registered_players[0].id
        assert match.is_completed is True

    def test_match_next_match_link(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Matches can be linked via next_match_id."""
        next_match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[2].id,
            player2_id=registered_players[3].id,
            map_id=default_map.id,
            round_name="Semifinals",
            match_status="scheduled",
        )
        db.add(next_match)
        db.commit()
        db.refresh(next_match)

        curr_match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            round_name="Round of 8",
            match_status="scheduled",
            next_match_id=next_match.id,
        )
        db.add(curr_match)
        db.commit()
        db.refresh(curr_match)

        assert curr_match.next_match_id == next_match.id
        assert curr_match.next_match.id == next_match.id

    def test_match_loser_next_match_link(self, db: Session, winner_bracket: Bracket, loser_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Matches can link losers to loser bracket via loser_next_match_id."""
        loser_match = Match(
            bracket_id=loser_bracket.id,
            player1_id=registered_players[4].id,
            player2_id=registered_players[5].id,
            map_id=default_map.id,
            round_name="Loser Round 1",
            match_status="scheduled",
        )
        db.add(loser_match)
        db.commit()
        db.refresh(loser_match)

        winner_match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[7].id,
            map_id=default_map.id,
            round_name="Round of 8",
            match_status="scheduled",
            loser_next_match_id=loser_match.id,
        )
        db.add(winner_match)
        db.commit()
        db.refresh(winner_match)

        assert winner_match.loser_next_match_id == loser_match.id

    def test_match_grandfinals_reset_flag(self, db: Session, gf_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """is_grandfinals_reset flag works correctly."""
        normal_gf = Match(
            bracket_id=gf_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            round_name="Grand Finals",
            match_status="scheduled",
            is_grandfinals_reset=False,
        )
        reset_gf = Match(
            bracket_id=gf_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            round_name="Grand Finals Reset",
            match_status="scheduled",
            is_grandfinals_reset=True,
        )
        db.add_all([normal_gf, reset_gf])
        db.commit()

        assert normal_gf.is_grandfinals_reset is False
        assert reset_gf.is_grandfinals_reset is True

    def test_match_bracket_relationship(self, sample_match: Match, winner_bracket: Bracket):
        """Match.bracket relationship resolves correctly."""
        assert sample_match.bracket.id == winner_bracket.id
        assert sample_match.bracket.bracket_name == "Winner Bracket"

    def test_match_player_relationships(self, db: Session, sample_match: Match, registered_players: list[User]):
        """Match player relationships resolve correctly."""
        db.refresh(sample_match)
        assert sample_match.player1.username == registered_players[0].username
        assert sample_match.player2.username == registered_players[7].username

    def test_match_repr(self, sample_match: Match, winner_bracket: Bracket):
        """__repr__ includes id, bracket_id, and status."""
        r = repr(sample_match)
        assert str(sample_match.id) in r
        assert str(winner_bracket.id) in r
        assert "scheduled" in r

    def test_match_forfeit_fields(self, db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]):
        """Forfeit-related fields can be set."""
        match = Match(
            bracket_id=winner_bracket.id,
            player1_id=registered_players[0].id,
            player2_id=registered_players[1].id,
            map_id=default_map.id,
            match_status="forfeit",
            is_completed=True,
            winner_id=registered_players[0].id,
            no_show_player_id=registered_players[1].id,
            forfeit_reason="Player did not show up",
        )
        db.add(match)
        db.commit()
        db.refresh(match)

        assert match.match_status == "forfeit"
        assert match.no_show_player_id == registered_players[1].id
        assert match.forfeit_reason == "Player did not show up"
