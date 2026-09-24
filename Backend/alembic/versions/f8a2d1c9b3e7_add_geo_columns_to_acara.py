"""add geo columns to acara

Revision ID: f8a2d1c9b3e7
Revises: e7f3b2a91c04
Create Date: 2026-09-24 19:06:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8a2d1c9b3e7'
down_revision: Union[str, Sequence[str], None] = 'e7f3b2a91c04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Tambah kolom geofence ke tabel acara.

    Kolom ini dipakai untuk membatasi voting hanya dari lokasi tertentu.
    Semua kolom nullable — jika NULL berarti tidak ada pembatasan lokasi.
    """
    with op.batch_alter_table("acara") as batch_op:
        batch_op.add_column(sa.Column("geo_latitude",  sa.Float(),   nullable=True))
        batch_op.add_column(sa.Column("geo_longitude", sa.Float(),   nullable=True))
        batch_op.add_column(sa.Column("geo_radius",    sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("geo_toleransi", sa.Integer(), nullable=True))


def downgrade() -> None:
    """Hapus kolom geofence dari tabel acara."""
    with op.batch_alter_table("acara") as batch_op:
        batch_op.drop_column("geo_toleransi")
        batch_op.drop_column("geo_radius")
        batch_op.drop_column("geo_longitude")
        batch_op.drop_column("geo_latitude")
