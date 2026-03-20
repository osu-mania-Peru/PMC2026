"""Poll models for tournament community polls."""
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from models.base import Base


class Poll(Base):
    """
    Community poll created by staff.

    Attributes:
        id: Poll ID.
        title: Poll question/title.
        description: Optional longer description.
        created_by: Staff user who created the poll.
        poll_type: 'single' or 'multiple' choice.
        is_active: Whether poll is accepting votes.
        closes_at: Optional auto-close datetime.
        created_at: Creation timestamp.
        updated_at: Last update timestamp.
    """
    __tablename__ = "polls"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, comment='Poll question or title')
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment='Optional longer description')
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False, comment='Staff user who created the poll')
    poll_type: Mapped[str] = mapped_column(String(20), default='single', nullable=False, comment='single or multiple choice')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment='Whether poll is accepting votes')
    closes_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, comment='Auto-close datetime')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    options = relationship("PollOption", back_populates="poll", cascade="all, delete-orphan", order_by="PollOption.option_order")
    votes = relationship("PollVote", back_populates="poll", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_polls_is_active', 'is_active'),
        Index('ix_polls_closes_at', 'closes_at'),
    )

    def __repr__(self):
        return f"<Poll(id={self.id}, title='{self.title}', active={self.is_active})>"


class PollOption(Base):
    """
    A single option within a poll.

    Attributes:
        id: Option ID.
        poll_id: Parent poll.
        option_text: Display text for this option.
        option_order: Display order.
    """
    __tablename__ = "poll_options"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    poll_id: Mapped[int] = mapped_column(Integer, ForeignKey('polls.id', ondelete='CASCADE'), nullable=False)
    option_text: Mapped[str] = mapped_column(String(255), nullable=False, comment='Option display text')
    option_order: Mapped[int] = mapped_column(Integer, default=0, comment='Display order')

    # Relationships
    poll = relationship("Poll", back_populates="options")
    votes = relationship("PollVote", back_populates="option", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_poll_options_poll_id', 'poll_id'),
    )

    def __repr__(self):
        return f"<PollOption(id={self.id}, text='{self.option_text}')>"


class PollVote(Base):
    """
    A user's vote on a poll option.

    Attributes:
        id: Vote ID.
        poll_id: Poll being voted on.
        option_id: Option selected.
        user_id: Voter.
        created_at: When vote was cast.
    """
    __tablename__ = "poll_votes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    poll_id: Mapped[int] = mapped_column(Integer, ForeignKey('polls.id', ondelete='CASCADE'), nullable=False)
    option_id: Mapped[int] = mapped_column(Integer, ForeignKey('poll_options.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    poll = relationship("Poll", back_populates="votes")
    option = relationship("PollOption", back_populates="votes")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint('poll_id', 'user_id', name='uq_poll_vote_single'),
        Index('ix_poll_votes_poll_id', 'poll_id'),
        Index('ix_poll_votes_user_id', 'user_id'),
    )

    def __repr__(self):
        return f"<PollVote(id={self.id}, poll={self.poll_id}, user={self.user_id})>"
