"""change ln_percent to string

Revision ID: a905278ae244
Revises: 007
Create Date: 2026-01-03 14:54:29.867613

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a905278ae244'
down_revision: Union[str, Sequence[str], None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        'mappool_maps',
        'ln_percent',
        existing_type=sa.Integer(),
        type_=sa.String(20),
        existing_nullable=False,
        server_default='0'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'mappool_maps',
        'ln_percent',
        existing_type=sa.String(20),
        type_=sa.Integer(),
        existing_nullable=False,
        server_default='0'
    )
