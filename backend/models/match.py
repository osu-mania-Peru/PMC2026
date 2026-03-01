"""Match model for tournament matches."""
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from models.base import Base


class Match(Base):
    """
    Tournament match between two players.

    Attributes:
        id: Match ID.
        bracket_id: Foreign key to containing bracket.
        player1_id: First player's user ID.
        player2_id: Second player's user ID.
        map_id: Map being played.
        player1_score: Player 1's final score.
        player2_score: Player 2's final score.
        winner_id: Winner's user ID.
        scheduled_time: Scheduled start time.
        actual_start_time: Actual start time.
        mp_link: Multiplayer lobby link.
        referee_name: Referee display name (free text).
        match_status: One of 'scheduled', 'in_progress', 'completed', 'cancelled', 'forfeit'.
        is_completed: Whether match has finished.
        round_name: Display name (e.g., 'Quarterfinals').
        next_match_id: Match winner advances to.
        loser_next_match_id: Match loser goes to (double elimination).
        is_grandfinals_reset: True if this is a bracket reset match.
    """
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    bracket_id: Mapped[int] = mapped_column(Integer, ForeignKey('brackets.id'), nullable=False)
    player1_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('users.id'), nullable=True)
    player2_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('users.id'), nullable=True)
    map_id: Mapped[int] = mapped_column(Integer, ForeignKey('maps.id'), nullable=False)
    player1_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, comment='Player 1 final score')
    player2_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, comment='Player 2 final score')
    winner_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('users.id'), nullable=True, comment='Winner of the match')
    scheduled_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, comment='When match is scheduled to happen')
    actual_start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, comment='When match actually started')
    match_status: Mapped[str] = mapped_column(
        String(20),
        default='scheduled',
        nullable=False,
        comment='scheduled, in_progress, completed, cancelled, forfeit'
    )
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    mp_link: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment='Multiplayer lobby link (e.g. osu.ppy.sh/mp/...)')
    referee_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, comment='Referee display name (free text)')
    no_show_player_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('users.id'), nullable=True, comment='Player who didn\'t show up')
    forfeit_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment='Reason for forfeit/cancellation')
    round_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment='Round name (e.g., Round of 16, Quarterfinals)')
    next_match_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('matches.id'), nullable=True, comment='Next match for winner')
    loser_next_match_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('matches.id'), nullable=True, comment='Next match for loser (double elimination)')
    is_grandfinals_reset: Mapped[bool] = mapped_column(Boolean, default=False, comment='True if this is the bracket reset match')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    bracket = relationship("Bracket", back_populates="matches")
    player1 = relationship("User", foreign_keys=[player1_id])
    player2 = relationship("User", foreign_keys=[player2_id])
    winner = relationship("User", foreign_keys=[winner_id])
    no_show_player = relationship("User", foreign_keys=[no_show_player_id])
    map = relationship("Map", back_populates="matches")
    notifications = relationship("Notification", back_populates="related_match")
    next_match = relationship("Match", foreign_keys=[next_match_id], remote_side="Match.id")
    loser_next_match = relationship("Match", foreign_keys=[loser_next_match_id], remote_side="Match.id")

    # Indexes
    __table_args__ = (
        Index('ix_matches_bracket_id', 'bracket_id'),
        Index('ix_matches_player1_id', 'player1_id'),
        Index('ix_matches_player2_id', 'player2_id'),
        Index('ix_matches_winner_id', 'winner_id'),
        Index('ix_matches_match_status', 'match_status'),
        Index('ix_matches_next_match_id', 'next_match_id'),
        Index('ix_matches_loser_next_match_id', 'loser_next_match_id'),
    )

    def __repr__(self):
        return f"<Match(id={self.id}, bracket_id={self.bracket_id}, status='{self.match_status}')>"
