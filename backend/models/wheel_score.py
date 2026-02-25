"""Wheel score model for PMC Wheel minigame."""
from datetime import datetime

from sqlalchemy import Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from models.base import Base


class WheelScore(Base):
    """Tracks a user's cumulative PMC Wheel score and spin count."""
    __tablename__ = "wheel_scores"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    spins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
