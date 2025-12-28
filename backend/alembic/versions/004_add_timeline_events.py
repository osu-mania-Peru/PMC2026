"""Add timeline_events table for tournament schedule

Revision ID: 004
Revises: 003
Create Date: 2025-12-28

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Create timeline_events table
    op.create_table(
        'timeline_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('event_id', sa.String(length=50), nullable=False, comment='Unique slug identifier'),
        sa.Column('date_range', sa.String(length=50), nullable=False, comment='Display date range'),
        sa.Column('title', sa.String(length=100), nullable=False, comment='Event title'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0', comment='Display order'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id', name='uq_timeline_events_event_id')
    )


def downgrade():
    op.drop_table('timeline_events')
