"""merge: geo+chatbot heads

Revision ID: b2c3d4e5f6a8
Revises: a9f3c2b8e1d7, c3d4e5f6a7b8
Create Date: 2026-09-30 16:08:00.000000

Merge migration untuk menyatukan dua branch head:
- a9f3c2b8e1d7: device_hash di tabel responden
- c3d4e5f6a7b8: chatbot knowledge flexible content + unanswered embedding
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a8'
down_revision: Union[str, Sequence[str], None] = ('a9f3c2b8e1d7', 'c3d4e5f6a7b8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
