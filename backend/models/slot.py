"""Slot model for tournament mappool slot definitions."""
from datetime import datetime

from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from models.base import Base


class Slot(Base):
    """
    Slot definition for mappool maps.

    Attributes:
        id: Primary key.
        name: Slot name (e.g., 'NM1', 'HD1', 'HR1').
        color: Hex color code for the slot (e.g., '#3b82f6').
        slot_order: Order for display (lower = shown first).
        created_at: Creation timestamp.
        updated_at: Last update timestamp.
    """
    __tablename__ = "slots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default='#3b82f6')
    slot_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Slot(id={self.id}, name='{self.name}')>"
