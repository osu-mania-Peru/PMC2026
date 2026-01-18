"""Add mania_country_rank column to users table.

Revision ID: 009_add_mania_country_rank
Revises: 008_add_mania_stats
Create Date: 2026-01-18

"""
from alembic import op
import sqlalchemy as sa

revision = '009_add_mania_country_rank'
down_revision = '008_add_mania_stats'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('mania_country_rank', sa.Integer(), nullable=True, comment='osu!mania country rank'))


def downgrade() -> None:
    op.drop_column('users', 'mania_country_rank')
