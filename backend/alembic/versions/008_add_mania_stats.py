"""Add mania_rank and mania_pp columns to users table.

Revision ID: 008_add_mania_stats
Revises: f218da82a63c
Create Date: 2026-01-18

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '008_add_mania_stats'
down_revision = 'f218da82a63c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('mania_rank', sa.Integer(), nullable=True, comment='osu!mania global rank'))
    op.add_column('users', sa.Column('mania_pp', sa.Float(), nullable=True, comment='osu!mania performance points'))


def downgrade() -> None:
    op.drop_column('users', 'mania_pp')
    op.drop_column('users', 'mania_rank')
