from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from models.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False, comment='User who performed the action')
    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment='create_match, update_score, override_result, advance_bracket, etc.'
    )
    entity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment='match, bracket, user, map, tournament_state'
    )
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, comment='ID of the affected entity')
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment='JSON of previous state')
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment='JSON of new state')
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True, comment='IP address of user')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    # Indexes
    __table_args__ = (
        Index('ix_audit_logs_user_id', 'user_id'),
        Index('ix_audit_logs_entity_type', 'entity_type'),
        Index('ix_audit_logs_created_at', 'created_at'),
    )

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}', entity_type='{self.entity_type}')>"
