"""News item model for tournament announcements."""
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from models.base import Base


class NewsItem(Base):
    """
    Tournament news/announcement item.

    Attributes:
        id: Internal database ID.
        date: Display date (e.g., '25/12/2025').
        title: News headline/content.
        sort_order: Order for display (lower = newer).
        created_at: Creation timestamp.
        updated_at: Last update timestamp.
    """
    __tablename__ = "news_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[str] = mapped_column(String(20), nullable=False, comment='Display date')
    title: Mapped[str] = mapped_column(Text, nullable=False, comment='News headline/content')
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment='Display order')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<NewsItem(id={self.id}, date='{self.date}', title='{self.title[:30]}...')>"
