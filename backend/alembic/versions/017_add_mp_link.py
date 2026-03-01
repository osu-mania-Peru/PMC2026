"""Add mp_link to matches.

Revision ID: 017_add_mp_link
Revises: 016_referee_id_to_name
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa

revision = '017_add_mp_link'
down_revision = '016_referee_id_to_name'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('matches', sa.Column('mp_link', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('matches', 'mp_link')
