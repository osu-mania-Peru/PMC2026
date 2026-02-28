"""Add referee_id to matches.

Revision ID: 015_add_match_referee
Revises: 014_add_wheel_rigging_columns
Create Date: 2026-02-28

"""
from alembic import op
import sqlalchemy as sa

revision = '015_add_match_referee'
down_revision = '014_add_wheel_rigging_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('matches', sa.Column('referee_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.create_index('ix_matches_referee_id', 'matches', ['referee_id'])


def downgrade() -> None:
    op.drop_index('ix_matches_referee_id', table_name='matches')
    op.drop_column('matches', 'referee_id')
