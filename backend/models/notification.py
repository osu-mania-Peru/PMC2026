from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from models.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    notification_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment='match_scheduled, match_result, bracket_advance, registration_confirmed'
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    related_match_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey('matches.id'),
        nullable=True,
        comment='Associated match if applicable'
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="notifications")
    related_match = relationship("Match", back_populates="notifications")

    # Indexes
    __table_args__ = (
        Index('ix_notifications_user_id', 'user_id'),
        Index('ix_notifications_is_read', 'is_read'),
        Index('ix_notifications_created_at', 'created_at'),
    )

    def __repr__(self):
        return f"<Notification(id={self.id}, type='{self.notification_type}', is_read={self.is_read})>"
