"""Add news_items table for tournament announcements

Revision ID: 005
Revises: 004
Create Date: 2025-12-28

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # Create news_items table
    op.create_table(
        'news_items',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('date', sa.String(length=20), nullable=False, comment='Display date'),
        sa.Column('title', sa.Text(), nullable=False, comment='News headline/content'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0', comment='Display order'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('news_items')
