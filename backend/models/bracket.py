from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Integer, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from models.base import Base


class Bracket(Base):
    __tablename__ = "brackets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    bracket_size: Mapped[int] = mapped_column(Integer, nullable=False, comment='32, 16, 8, 4, 2')
    bracket_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment='e.g., Round of 32, Round of 16, Quarterfinals, Semifinals, Finals'
    )
    bracket_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default='winner',
        comment='winner or loser bracket for double elimination'
    )
    bracket_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        unique=True,
        comment='Order in tournament (1=first round, 2=second, etc.)'
    )
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    matches = relationship("Match", back_populates="bracket", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index('ix_brackets_bracket_order', 'bracket_order', unique=True),
        Index('ix_brackets_bracket_type', 'bracket_type'),
    )

    def __repr__(self):
        return f"<Bracket(id={self.id}, name='{self.bracket_name}', size={self.bracket_size})>"
