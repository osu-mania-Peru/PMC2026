"""Replace referee_id FK with referee_name text field.

Revision ID: 016_referee_id_to_name
Revises: 015_add_match_referee
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa

revision = '016_referee_id_to_name'
down_revision = '015_add_match_referee'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index('ix_matches_referee_id', table_name='matches')
    op.drop_column('matches', 'referee_id')
    op.add_column('matches', sa.Column('referee_name', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('matches', 'referee_name')
    op.add_column('matches', sa.Column('referee_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.create_index('ix_matches_referee_id', 'matches', ['referee_id'])
