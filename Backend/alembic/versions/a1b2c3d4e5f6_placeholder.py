"""placeholder - revision yang hilang dari chain

Revision ID: a1b2c3d4e5f6
Revises: 6279c83e3a11
Create Date: 2026-09-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '6279c83e3a11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Placeholder — perubahan sudah diterapkan manual sebelum file ini dibuat
    pass


def downgrade() -> None:
    pass
