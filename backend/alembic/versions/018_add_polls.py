"""Add polls, poll_options, and poll_votes tables.

Revision ID: 018_add_polls
Revises: 017_add_mp_link
Create Date: 2026-03-20

"""
from alembic import op
import sqlalchemy as sa

revision = '018_add_polls'
down_revision = '017_add_mp_link'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'polls',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('poll_type', sa.String(20), nullable=False, server_default='single'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('closes_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_polls_is_active', 'polls', ['is_active'])
    op.create_index('ix_polls_closes_at', 'polls', ['closes_at'])

    op.create_table(
        'poll_options',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('poll_id', sa.Integer, sa.ForeignKey('polls.id', ondelete='CASCADE'), nullable=False),
        sa.Column('option_text', sa.String(255), nullable=False),
        sa.Column('option_order', sa.Integer, nullable=False, server_default='0'),
    )
    op.create_index('ix_poll_options_poll_id', 'poll_options', ['poll_id'])

    op.create_table(
        'poll_votes',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('poll_id', sa.Integer, sa.ForeignKey('polls.id', ondelete='CASCADE'), nullable=False),
        sa.Column('option_id', sa.Integer, sa.ForeignKey('poll_options.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('poll_id', 'user_id', name='uq_poll_vote_single'),
    )
    op.create_index('ix_poll_votes_poll_id', 'poll_votes', ['poll_id'])
    op.create_index('ix_poll_votes_user_id', 'poll_votes', ['user_id'])


def downgrade() -> None:
    op.drop_table('poll_votes')
    op.drop_table('poll_options')
    op.drop_table('polls')
