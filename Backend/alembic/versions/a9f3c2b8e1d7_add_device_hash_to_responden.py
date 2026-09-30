"""add device_hash to responden

Revision ID: a9f3c2b8e1d7
Revises: f8a2d1c9b3e7
Create Date: 2026-09-30 16:05:00.000000

Mencatat SHA-256 fingerprint device per responden untuk mencegah
1 device vote lebih dari 1 kali per acara.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9f3c2b8e1d7'
down_revision: Union[str, Sequence[str], None] = 'f8a2d1c9b3e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Tambah kolom device_hash ke tabel responden.

    Kolom nullable agar responden lama (tanpa hash) tetap valid.
    Index dipasang untuk mempercepat pengecekan duplikat saat submit vote.
    """
    with op.batch_alter_table("responden") as batch_op:
        batch_op.add_column(
            sa.Column(
                "device_hash",
                sa.String(64),
                nullable=True,
            )
        )
        batch_op.create_index("ix_responden_device_hash", ["device_hash"])


def downgrade() -> None:
    """Hapus kolom device_hash dari tabel responden."""
    with op.batch_alter_table("responden") as batch_op:
        batch_op.drop_index("ix_responden_device_hash")
        batch_op.drop_column("device_hash")
