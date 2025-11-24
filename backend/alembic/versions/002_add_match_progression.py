"""Add match progression fields

Revision ID: 002
Revises: 001
Create Date: 2025-11-24

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Add progression fields to matches table
    op.add_column('matches', sa.Column('round_name', sa.String(length=50), nullable=True, comment='Round name (e.g., Round of 16, Quarterfinals)'))
    op.add_column('matches', sa.Column('next_match_id', sa.Integer(), nullable=True, comment='Next match for winner'))
    op.add_column('matches', sa.Column('loser_next_match_id', sa.Integer(), nullable=True, comment='Next match for loser (double elimination)'))
    op.add_column('matches', sa.Column('is_grandfinals_reset', sa.Boolean(), nullable=False, server_default='false', comment='True if this is the bracket reset match'))

    # Add foreign keys
    op.create_foreign_key('fk_matches_next_match_id', 'matches', 'matches', ['next_match_id'], ['id'])
    op.create_foreign_key('fk_matches_loser_next_match_id', 'matches', 'matches', ['loser_next_match_id'], ['id'])

    # Create indexes
    op.create_index('ix_matches_next_match_id', 'matches', ['next_match_id'])
    op.create_index('ix_matches_loser_next_match_id', 'matches', ['loser_next_match_id'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_matches_loser_next_match_id', table_name='matches')
    op.drop_index('ix_matches_next_match_id', table_name='matches')

    # Drop foreign keys
    op.drop_constraint('fk_matches_loser_next_match_id', 'matches', type_='foreignkey')
    op.drop_constraint('fk_matches_next_match_id', 'matches', type_='foreignkey')

    # Drop columns
    op.drop_column('matches', 'is_grandfinals_reset')
    op.drop_column('matches', 'loser_next_match_id')
    op.drop_column('matches', 'next_match_id')
    op.drop_column('matches', 'round_name')
