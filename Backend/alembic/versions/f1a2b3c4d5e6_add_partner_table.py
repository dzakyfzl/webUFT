"""add_partner_table

Revision ID: f1a2b3c4d5e6
Revises: d41f55293d3c
Create Date: 2026-09-21 16:44:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e7f3b2a91c04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: buat tabel partner."""
    op.create_table(
        'partner',
        sa.Column('partnerID', sa.Integer(), nullable=False),
        sa.Column('fileID', sa.Integer(), nullable=True),
        sa.Column('label', sa.String(length=255), nullable=False),
        sa.Column('judul', sa.String(length=255), nullable=False),
        sa.Column('deskripsi', sa.Text(), nullable=True),
        sa.Column('kategori', sa.String(length=50), nullable=False, server_default='sponsor'),
        sa.Column('urutan', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(['fileID'], ['file.fileID'], ),
        sa.PrimaryKeyConstraint('partnerID'),
    )
    op.create_index(op.f('ix_partner_partnerID'), 'partner', ['partnerID'], unique=False)


def downgrade() -> None:
    """Downgrade schema: hapus tabel partner."""
    op.drop_index(op.f('ix_partner_partnerID'), table_name='partner')
    op.drop_table('partner')
