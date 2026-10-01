"""chatbot_unanswered: tambah kolom hit_count untuk semantic dedup counter

Revision ID: d5e6f7a8b9c1
Revises: b2c3d4e5f6a8
Create Date: 2026-10-01 11:00:00.000000

Perubahan:
- chatbot_unanswered: tambah kolom 'hit_count' INTEGER NOT NULL DEFAULT 1
  Kolom ini mencatat berapa kali pertanyaan yang semantically mirip
  (cosine similarity >= 0.85) ditanyakan oleh pengunjung berbeda.
  Alih-alih menyimpan baris duplikat, sistem kini increment hit_count
  pada record yang sudah ada.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c1'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'chatbot_unanswered',
        sa.Column('hit_count', sa.Integer(), nullable=False, server_default='1'),
    )


def downgrade() -> None:
    op.drop_column('chatbot_unanswered', 'hit_count')
