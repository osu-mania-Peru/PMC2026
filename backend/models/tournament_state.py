from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from models.base import Base


class TournamentState(Base):
    __tablename__ = "tournament_state"

    id: Mapped[int] = mapped_column(primary_key=True)
    current_bracket_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey('brackets.id'),
        nullable=True,
        comment='Which bracket is currently active'
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default='registration',
        nullable=False,
        comment='registration, ongoing, completed'
    )
    registration_open: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, comment='When tournament started')
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, comment='When tournament ended')
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    current_bracket = relationship("Bracket", foreign_keys=[current_bracket_id])

    def __repr__(self):
        return f"<TournamentState(id={self.id}, status='{self.status}', registration_open={self.registration_open})>"
