"""menambah table shortlink

Revision ID: 6279c83e3a11
Revises: d9c6e9c6efdd
Create Date: 2026-08-04 22:45:30.467348

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '6279c83e3a11'
down_revision: Union[str, Sequence[str], None] = 'd9c6e9c6efdd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: buat tabel shortlink."""
    op.create_table(
        'shortlink',
        sa.Column('linkID', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('destinationUrl', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('linkID'),
    )
    op.create_index(op.f('ix_shortlink_linkID'), 'shortlink', ['linkID'], unique=False)
    op.create_index(op.f('ix_shortlink_slug'), 'shortlink', ['slug'], unique=True)


def downgrade() -> None:
    """Downgrade schema: hapus tabel shortlink."""
    op.drop_index(op.f('ix_shortlink_slug'), table_name='shortlink')
    op.drop_index(op.f('ix_shortlink_linkID'), table_name='shortlink')
    op.drop_table('shortlink')
