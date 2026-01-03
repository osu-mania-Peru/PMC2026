"""Mappool models for tournament map collections."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Integer, Boolean, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from models.base import Base


class Mappool(Base):
    """
    Tournament mappool representing a stage's map collection.

    Attributes:
        id: Primary key.
        stage_name: Display name (e.g., 'Quarterfinals', 'Round of 16').
        stage_order: Order for display (lower = shown first).
        download_url: Optional URL to download the full mappack.
        is_visible: Whether this pool is publicly visible.
        created_at: Creation timestamp.
        updated_at: Last update timestamp.
    """
    __tablename__ = "mappools"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    stage_name: Mapped[str] = mapped_column(String(100), nullable=False)
    stage_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    download_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to maps
    maps: Mapped[list["MappoolMap"]] = relationship("MappoolMap", back_populates="mappool", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Mappool(id={self.id}, stage_name='{self.stage_name}')>"


class MappoolMap(Base):
    """
    Individual beatmap in a mappool.

    Attributes:
        id: Primary key.
        mappool_id: Foreign key to parent mappool.
        slot: Mod slot identifier (e.g., 'NM1', 'HD1', 'HR1', 'DT1', 'FM1', 'TB').
        slot_order: Order within the mappool.
        beatmap_id: osu! beatmap ID.
        artist: Song artist.
        title: Song title.
        difficulty_name: Difficulty name in brackets.
        banner_url: URL to beatmap background image.
        star_rating: Star rating (SR).
        bpm: Beats per minute.
        length_seconds: Map length in seconds.
        od: Overall Difficulty.
        hp: Health Drain.
        ln_percent: Long Note percentage (for mania).
        mapper: Beatmap creator username.
        is_custom_map: Whether this is a custom chart.
        is_custom_song: Whether this uses custom music.
        created_at: Creation timestamp.
        updated_at: Last update timestamp.
    """
    __tablename__ = "mappool_maps"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mappool_id: Mapped[int] = mapped_column(ForeignKey("mappools.id", ondelete="CASCADE"), nullable=False)
    slot: Mapped[str] = mapped_column(String(10), nullable=False)
    slot_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    beatmap_id: Mapped[str] = mapped_column(String(20), nullable=False)
    artist: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    difficulty_name: Mapped[str] = mapped_column(String(255), nullable=False)
    banner_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    star_rating: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    bpm: Mapped[int] = mapped_column(Integer, nullable=False)
    length_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    od: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False)
    hp: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False)
    ln_percent: Mapped[str] = mapped_column(String(20), nullable=False, default='0')
    mapper: Mapped[str] = mapped_column(String(100), nullable=False)
    is_custom_map: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_custom_song: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to parent mappool
    mappool: Mapped["Mappool"] = relationship("Mappool", back_populates="maps")

    def __repr__(self):
        return f"<MappoolMap(id={self.id}, slot='{self.slot}', title='{self.title}')>"
