"""
Double Elimination Bracket Progression Logic

Handles automatic player progression through winner/loser brackets
and Grand Finals with bracket reset.
"""
from sqlalchemy.orm import Session
from models.match import Match


class BracketProgressionService:
    """
    Service for managing match progression in double elimination tournaments.

    Handles automatic player advancement through winner/loser brackets
    and Grand Finals bracket reset logic.

    Args:
        db: SQLAlchemy database session.

    Example:
        >>> service = BracketProgressionService(db)
        >>> result = service.progress_match(completed_match)
    """

    def __init__(self, db: Session):
        self.db = db

    def progress_match(self, match: Match) -> dict:
        """
        Progress players after a match is completed.

        Args:
            match: Completed :class:`~models.match.Match` with winner set.

        Returns:
            dict: Progression result with keys:
                - ``winner_advanced_to``: Match ID where winner placed, or None.
                - ``loser_advanced_to``: Match ID where loser placed, or None.
                - ``grandfinals_reset_created``: Whether bracket reset was created.
                - ``bracket_reset_match_id``: Reset match ID if created.

        Raises:
            ValueError: If match is not completed or has no winner.
        """
        if not match.is_completed or not match.winner_id:
            raise ValueError("Match must be completed with a winner")

        result = {
            "winner_advanced_to": None,
            "loser_advanced_to": None,
            "grandfinals_reset_created": False
        }

        winner_id = match.winner_id
        loser_id = match.player1_id if match.winner_id == match.player2_id else match.player2_id

        # Progress winner to next match
        if match.next_match_id:
            next_match = self.db.query(Match).filter(Match.id == match.next_match_id).first()
            if next_match:
                self._assign_player_to_match(next_match, winner_id)
                result["winner_advanced_to"] = next_match.id

        # Progress loser to loser bracket (if this is a winner bracket match)
        if match.loser_next_match_id:
            loser_match = self.db.query(Match).filter(Match.id == match.loser_next_match_id).first()
            if loser_match:
                self._assign_player_to_match(loser_match, loser_id)
                result["loser_advanced_to"] = loser_match.id

        # Handle Grand Finals bracket reset
        if self._is_grandfinals_match(match) and not match.is_grandfinals_reset:
            # Check if loser bracket champion won
            if self._did_loser_bracket_champion_win(match):
                # Create bracket reset match
                reset_match = self._create_bracket_reset_match(match)
                result["grandfinals_reset_created"] = True
                result["bracket_reset_match_id"] = reset_match.id

        self.db.commit()
        return result

    def _assign_player_to_match(self, match: Match, player_id: int) -> None:
        """
        Assign a player to the next available slot in a match.

        Args:
            match: Target match to assign player to.
            player_id: User ID to assign.

        Raises:
            ValueError: If both player slots are already filled.
        """
        if not match.player1_id:
            match.player1_id = player_id
        elif not match.player2_id:
            match.player2_id = player_id
        else:
            raise ValueError(f"Match {match.id} already has both players assigned")

    def _is_grandfinals_match(self, match: Match) -> bool:
        """
        Check if match is a Grand Finals match (not reset).

        Args:
            match: Match to check.

        Returns:
            True if match is in grandfinals bracket and not a reset match.
        """
        from models.bracket import Bracket
        bracket = self.db.query(Bracket).filter(Bracket.id == match.bracket_id).first()
        if not bracket:
            return False
        return bracket.bracket_type == 'grandfinals' and not match.is_grandfinals_reset

    def _did_loser_bracket_champion_win(self, grandfinals_match: Match) -> bool:
        """
        Check if loser bracket champion won first Grand Finals.

        Args:
            grandfinals_match: The Grand Finals match.

        Returns:
            True if bracket reset is needed (loser bracket champion won).

        Note:
            Currently returns True always - needs implementation.
        """
        return True

    def _create_bracket_reset_match(self, original_grandfinals: Match) -> Match:
        """
        Create the bracket reset match (Grand Finals Game 2).

        Args:
            original_grandfinals: The first Grand Finals match.

        Returns:
            Newly created reset :class:`~models.match.Match`.

        Raises:
            ValueError: If Grand Finals bracket not found.
        """
        from models.bracket import Bracket

        bracket = self.db.query(Bracket).filter(
            Bracket.bracket_type == 'grandfinals'
        ).first()

        if not bracket:
            raise ValueError("Grand Finals bracket not found")

        # Create reset match with same players
        reset_match = Match(
            bracket_id=bracket.id,
            player1_id=original_grandfinals.player1_id,
            player2_id=original_grandfinals.player2_id,
            map_id=original_grandfinals.map_id,
            round_name="Grand Finals Reset",
            is_grandfinals_reset=True,
            match_status='scheduled'
        )

        self.db.add(reset_match)
        self.db.flush()  # Get the ID

        return reset_match
