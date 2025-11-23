from datetime import datetime

from sqlalchemy import String, Integer, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from models.base import Base


class Map(Base):
    __tablename__ = "maps"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    map_url: Mapped[str] = mapped_column(String(500), nullable=False, comment='osu! beatmap URL')
    map_name: Mapped[str] = mapped_column(String(200), nullable=False, comment='Song name')
    difficulty_name: Mapped[str] = mapped_column(String(100), nullable=False, comment='Difficulty name (e.g., Insane, Expert)')
    mapper_name: Mapped[str] = mapped_column(String(100), nullable=False, comment='Beatmap creator')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    matches = relationship("Match", back_populates="map")

    # Indexes
    __table_args__ = (
        Index('ix_maps_map_url', 'map_url'),
    )

    def __repr__(self):
        return f"<Map(id={self.id}, name='{self.map_name}', difficulty='{self.difficulty_name}')>"
