"""Make player1_id and player2_id nullable for bracket progression.

Revision ID: 010_nullable_match_player_ids
Revises: 009_add_mania_country_rank
Create Date: 2026-01-24

"""
from alembic import op
import sqlalchemy as sa

revision = '010_nullable_match_player_ids'
down_revision = '009_add_mania_country_rank'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('matches', 'player1_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('matches', 'player2_id', existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.execute("UPDATE matches SET player1_id = 0 WHERE player1_id IS NULL")
    op.execute("UPDATE matches SET player2_id = 0 WHERE player2_id IS NULL")
    op.alter_column('matches', 'player1_id', existing_type=sa.Integer(), nullable=False)
    op.alter_column('matches', 'player2_id', existing_type=sa.Integer(), nullable=False)
