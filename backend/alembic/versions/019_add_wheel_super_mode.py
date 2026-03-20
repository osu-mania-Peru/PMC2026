"""Add super_mode to wheel_scores.

Revision ID: 019_add_wheel_super_mode
Revises: 018_add_polls
Create Date: 2026-03-20

"""
from alembic import op
import sqlalchemy as sa

revision = '019_add_wheel_super_mode'
down_revision = '018_add_polls'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('wheel_scores', sa.Column('super_mode', sa.Boolean, nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('wheel_scores', 'super_mode')
