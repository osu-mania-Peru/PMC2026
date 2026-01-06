"""add_beatmapset_id_to_mappool_maps

Revision ID: f218da82a63c
Revises: a905278ae244
Create Date: 2026-01-06 21:14:28.308292

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f218da82a63c'
down_revision: Union[str, Sequence[str], None] = 'a905278ae244'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('mappool_maps', sa.Column('beatmapset_id', sa.String(20), nullable=True, comment='osu! beatmapset ID for downloads'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('mappool_maps', 'beatmapset_id')
