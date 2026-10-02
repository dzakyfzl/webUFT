"""placeholder: fix missing revision b2c3d4e5f6a8

Revision ID: b2c3d4e5f6a8
Revises: c3d4e5f6a7b8
Create Date: 2026-10-02 17:30:00.000000

File ini dibuat karena database server sudah menyimpan revision b2c3d4e5f6a8
di tabel alembic_version, tapi file migration-nya tidak ada di codebase.
Placeholder ini kosong (no-op) — hanya untuk menyambung chain agar
`alembic upgrade head` tidak error.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a8'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op placeholder — revision ini sudah pernah applied di server
    pass


def downgrade() -> None:
    # No-op placeholder
    pass
