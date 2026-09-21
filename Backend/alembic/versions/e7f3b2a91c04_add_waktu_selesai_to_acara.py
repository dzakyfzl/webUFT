"""add_waktu_selesai_to_acara

Revision ID: e7f3b2a91c04
Revises: d41f55293d3c
Create Date: 2026-09-21 16:14:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e7f3b2a91c04'
down_revision: Union[str, Sequence[str], None] = 'd41f55293d3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('acara', sa.Column('waktu_selesai', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('acara', 'waktu_selesai')
