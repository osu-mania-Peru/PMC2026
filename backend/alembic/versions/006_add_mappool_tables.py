"""Add mappool and mappool_maps tables for tournament map collections

Revision ID: 006
Revises: 005
Create Date: 2025-12-28

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # Create mappools table
    op.create_table(
        'mappools',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('stage_name', sa.String(length=100), nullable=False),
        sa.Column('stage_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('download_url', sa.Text(), nullable=True),
        sa.Column('is_visible', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create mappool_maps table
    op.create_table(
        'mappool_maps',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('mappool_id', sa.Integer(), nullable=False),
        sa.Column('slot', sa.String(length=10), nullable=False),
        sa.Column('slot_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('beatmap_id', sa.String(length=20), nullable=False),
        sa.Column('artist', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('difficulty_name', sa.String(length=255), nullable=False),
        sa.Column('banner_url', sa.Text(), nullable=True),
        sa.Column('star_rating', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('bpm', sa.Integer(), nullable=False),
        sa.Column('length_seconds', sa.Integer(), nullable=False),
        sa.Column('od', sa.Numeric(precision=4, scale=1), nullable=False),
        sa.Column('hp', sa.Numeric(precision=4, scale=1), nullable=False),
        sa.Column('ln_percent', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('mapper', sa.String(length=100), nullable=False),
        sa.Column('is_custom_map', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_custom_song', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['mappool_id'], ['mappools.id'], ondelete='CASCADE')
    )

    # Create index for faster lookups
    op.create_index('ix_mappool_maps_mappool_id', 'mappool_maps', ['mappool_id'])


def downgrade():
    op.drop_index('ix_mappool_maps_mappool_id', 'mappool_maps')
    op.drop_table('mappool_maps')
    op.drop_table('mappools')
