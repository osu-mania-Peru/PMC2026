"""API Key model for third-party integrations."""
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from models.base import Base


class APIKey(Base):
    """
    API key for programmatic access.

    Attributes:
        id: Key ID.
        key_hash: SHA-256 hash of the raw key.
        key_prefix: First 12 chars for identification (e.g., 'pmc_abc12345').
        name: Description of key purpose.
        created_by_id: Staff user who created the key.
        is_active: Whether key is valid for use.
        last_used_at: Last successful authentication.
        expires_at: Optional expiration timestamp.
        created_at: Creation timestamp.
    """
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, comment='SHA-256 hash of the API key')
    key_prefix: Mapped[str] = mapped_column(String(12), nullable=False, comment='First 12 chars for identification (e.g., pmc_abc12345)')
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment='Description of what this key is used for')
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, comment='Optional expiration date')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    created_by = relationship("User")

    # Indexes
    __table_args__ = (
        Index('ix_api_keys_key_hash', 'key_hash'),
        Index('ix_api_keys_key_prefix', 'key_prefix'),
        Index('ix_api_keys_is_active', 'is_active'),
    )

    def __repr__(self):
        return f"<APIKey(id={self.id}, name='{self.name}', prefix='{self.key_prefix}')>"
