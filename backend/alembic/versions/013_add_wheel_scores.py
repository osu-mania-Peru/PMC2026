"""Add wheel_scores table for PMC Wheel minigame.

Revision ID: 013_add_wheel_scores
Revises: 012_add_scheduling_tables
Create Date: 2026-02-25

"""
from alembic import op
import sqlalchemy as sa

revision = '013_add_wheel_scores'
down_revision = '012_add_scheduling_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'wheel_scores',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('score', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('spins', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('wheel_scores')
