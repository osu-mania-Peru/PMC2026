"""Add match scheduling tables.

Revision ID: 012_add_scheduling_tables
Revises: 011_add_stays_playing
Create Date: 2026-02-23

"""
from alembic import op
import sqlalchemy as sa

revision = '012_add_scheduling_tables'
down_revision = '011_add_stays_playing'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'match_availability',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('match_id', sa.Integer(), sa.ForeignKey('matches.id'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_match_availability_match_id', 'match_availability', ['match_id'])
    op.create_index('ix_match_availability_user_id', 'match_availability', ['user_id'])

    op.create_table(
        'match_time_proposals',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('match_id', sa.Integer(), sa.ForeignKey('matches.id'), nullable=False),
        sa.Column('proposed_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('proposed_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_match_time_proposals_match_id', 'match_time_proposals', ['match_id'])
    op.create_index('ix_match_time_proposals_proposed_by', 'match_time_proposals', ['proposed_by'])
    op.create_index('ix_match_time_proposals_status', 'match_time_proposals', ['status'])


def downgrade() -> None:
    op.drop_table('match_time_proposals')
    op.drop_table('match_availability')
