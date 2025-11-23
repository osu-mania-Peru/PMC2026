from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from models.base import Base


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    token: Mapped[str] = mapped_column(String(500), unique=True, nullable=False, comment='Session token or JWT')
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="sessions")

    # Indexes
    __table_args__ = (
        Index('ix_sessions_user_id', 'user_id'),
        Index('ix_sessions_token', 'token'),
        Index('ix_sessions_expires_at', 'expires_at'),
    )

    def __repr__(self):
        return f"<Session(id={self.id}, user_id={self.user_id})>"
