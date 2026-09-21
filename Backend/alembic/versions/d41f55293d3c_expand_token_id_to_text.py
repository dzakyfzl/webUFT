"""expand_token_id_to_text

Revision ID: d41f55293d3c
Revises: a1b2c3d4e5f6
Create Date: 2026-09-06 15:11:43.007325

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd41f55293d3c'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Semua perubahan ini (token→text, shortlink unique) sudah diterapkan
    di server via create_all sebelum migration ini dibuat. Tidak ada yang perlu dijalankan."""
    pass


def downgrade() -> None:
    pass
