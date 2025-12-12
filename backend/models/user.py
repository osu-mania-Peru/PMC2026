"""User model for tournament participants and staff."""
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Integer, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from models.base import Base


class User(Base):
    """
    Tournament user representing an osu! player.

    Attributes:
        id: Internal database ID.
        osu_id: osu! user ID from OAuth.
        username: osu! username.
        flag_code: ISO 3166-1 alpha-2 country code.
        is_staff: Whether user has staff privileges.
        is_registered: Whether user is registered for tournament.
        registered_at: Timestamp of tournament registration.
        seed_number: Player seeding for bracket placement.
        created_at: Account creation timestamp.
        updated_at: Last update timestamp.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    osu_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, comment='osu! user ID from OAuth')
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    flag_code: Mapped[str] = mapped_column(String(2), nullable=False, comment='ISO country code (e.g., PE, JP, US)')
    is_staff: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_registered: Mapped[bool] = mapped_column(Boolean, default=False, comment='Registered for the tournament')
    registered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, comment='When they registered')
    seed_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, comment='Player ranking/seed for bracket placement')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")

    # Indexes
    __table_args__ = (
        Index('ix_users_osu_id', 'osu_id'),
        Index('ix_users_flag_code', 'flag_code'),
        Index('ix_users_seed_number', 'seed_number'),
    )

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', osu_id={self.osu_id})>"
