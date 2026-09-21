"""expand_token_id_to_text

Revision ID: d41f55293d3c
Revises: a1b2c3d4e5f6
Create Date: 2026-09-06 15:11:43.007325

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd41f55293d3c'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema — hanya operasi webUFT (token, responden, shortlink)."""
    op.alter_column('responden', 'tokenID',
               existing_type=sa.VARCHAR(length=300),
               type_=sa.Text(),
               existing_nullable=True)
    op.drop_index(op.f('ix_shortlink_slug'), table_name='shortlink')
    op.create_unique_constraint(None, 'shortlink', ['slug'])
    op.alter_column('token', 'tokenID',
               existing_type=sa.VARCHAR(length=300),
               type_=sa.Text(),
               existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema — hanya operasi webUFT (token, responden, shortlink)."""
    op.alter_column('token', 'tokenID',
               existing_type=sa.Text(),
               type_=sa.VARCHAR(length=300),
               existing_nullable=False)
    op.drop_constraint(None, 'shortlink', type_='unique')
    op.create_index(op.f('ix_shortlink_slug'), 'shortlink', ['slug'], unique=True)
    op.alter_column('responden', 'tokenID',
               existing_type=sa.Text(),
               type_=sa.VARCHAR(length=300),
               existing_nullable=True)
