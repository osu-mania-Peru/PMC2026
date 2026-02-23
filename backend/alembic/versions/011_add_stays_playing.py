"""Add stays_playing column to users table.

Revision ID: 011_add_stays_playing
Revises: 010_nullable_match_player_ids
Create Date: 2026-02-23

"""
from alembic import op
import sqlalchemy as sa

revision = '011_add_stays_playing'
down_revision = '010_nullable_match_player_ids'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('stays_playing', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade() -> None:
    op.drop_column('users', 'stays_playing')
