"""Models for match scheduling: availability windows and time proposals."""
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from models.base import Base


class MatchAvailability(Base):
    """Time window when a player is available for a match."""
    __tablename__ = "match_availability"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(Integer, ForeignKey('matches.id'), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('ix_match_availability_match_id', 'match_id'),
        Index('ix_match_availability_user_id', 'user_id'),
    )

    def __repr__(self):
        return f"<MatchAvailability(id={self.id}, match={self.match_id}, user={self.user_id})>"


class MatchTimeProposal(Base):
    """A proposed time for playing a match."""
    __tablename__ = "match_time_proposals"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(Integer, ForeignKey('matches.id'), nullable=False)
    proposed_by: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    proposed_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default='pending', nullable=False)
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('ix_match_time_proposals_match_id', 'match_id'),
        Index('ix_match_time_proposals_proposed_by', 'proposed_by'),
        Index('ix_match_time_proposals_status', 'status'),
    )

    def __repr__(self):
        return f"<MatchTimeProposal(id={self.id}, match={self.match_id}, status='{self.status}')>"
