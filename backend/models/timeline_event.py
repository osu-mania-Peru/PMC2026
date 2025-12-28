"""Timeline event model for tournament schedule."""
from datetime import datetime

from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from models.base import Base


class TimelineEvent(Base):
    """
    Tournament timeline/schedule event.

    Attributes:
        id: Internal database ID.
        event_id: Unique identifier slug (e.g., 'registros', 'qualifiers').
        date_range: Display date range (e.g., '16/01 - 01/02').
        title: Event title (e.g., 'REGISTROS', 'QUALIFIERS').
        sort_order: Order for display.
        created_at: Creation timestamp.
        updated_at: Last update timestamp.
    """
    __tablename__ = "timeline_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment='Unique slug identifier')
    date_range: Mapped[str] = mapped_column(String(50), nullable=False, comment='Display date range')
    title: Mapped[str] = mapped_column(String(100), nullable=False, comment='Event title')
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment='Display order')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<TimelineEvent(id={self.id}, event_id='{self.event_id}', title='{self.title}')>"
