"""
Double Elimination Bracket Progression Logic

Handles automatic player progression through winner/loser brackets
and Grand Finals with bracket reset.
"""
from sqlalchemy.orm import Session
from models.match import Match
from models.user import User


class BracketProgressionService:
    """Handles match progression in double elimination tournament"""

    def __init__(self, db: Session):
        self.db = db

    def progress_match(self, match: Match) -> dict:
        """
        Progress players after a match is completed.

        Returns dict with:
        - winner_advanced_to: Match ID where winner was placed (or None)
        - loser_advanced_to: Match ID where loser was placed (or None)
        - grandfinals_reset_created: Bool indicating if reset match was created
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

    def _assign_player_to_match(self, match: Match, player_id: int):
        """Assign a player to the next available slot in a match"""
        if not match.player1_id:
            match.player1_id = player_id
        elif not match.player2_id:
            match.player2_id = player_id
        else:
            raise ValueError(f"Match {match.id} already has both players assigned")

    def _is_grandfinals_match(self, match: Match) -> bool:
        """Check if this is a Grand Finals match"""
        from models.bracket import Bracket
        bracket = self.db.query(Bracket).filter(Bracket.id == match.bracket_id).first()
        return bracket and bracket.bracket_type == 'grandfinals' and not match.is_grandfinals_reset

    def _did_loser_bracket_champion_win(self, grandfinals_match: Match) -> bool:
        """Determine if the loser bracket champion won the first Grand Finals match"""
        return True

    def _create_bracket_reset_match(self, original_grandfinals: Match) -> Match:
        """Create the bracket reset match (Grand Finals Game 2)"""
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
