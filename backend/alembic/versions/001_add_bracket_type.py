"""Add bracket_type field to brackets table

Revision ID: 001
Revises: 94505cbc33fc
Create Date: 2025-11-24

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = '94505cbc33fc'
branch_labels = None
depends_on = None


def upgrade():
    # Add bracket_type column to brackets table
    op.add_column('brackets', sa.Column('bracket_type', sa.String(length=20), nullable=False, server_default='winner', comment='winner, loser, or grandfinals bracket'))

    # Create index on bracket_type
    op.create_index('ix_brackets_bracket_type', 'brackets', ['bracket_type'])


def downgrade():
    # Drop index
    op.drop_index('ix_brackets_bracket_type', table_name='brackets')

    # Drop column
    op.drop_column('brackets', 'bracket_type')
