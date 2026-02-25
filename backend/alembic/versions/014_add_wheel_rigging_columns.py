"""Add rigging tracking columns to wheel_scores.

Revision ID: 014_add_wheel_rigging_columns
Revises: 013_add_wheel_scores
Create Date: 2026-02-25

"""
from alembic import op
import sqlalchemy as sa

revision = '014_add_wheel_rigging_columns'
down_revision = '013_add_wheel_scores'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('wheel_scores', sa.Column('has_hit_pmc', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('wheel_scores', sa.Column('first_pmc_spin', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('wheel_scores', 'first_pmc_spin')
    op.drop_column('wheel_scores', 'has_hit_pmc')
