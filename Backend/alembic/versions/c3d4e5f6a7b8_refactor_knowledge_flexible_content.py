"""refactor: knowledge flexible content + unanswered dedup embedding

Revision ID: c3d4e5f6a7b8
Revises: b1c2d3e4f5a6
Create Date: 2026-09-26 14:30:00.000000

Perubahan:
1. chatbot_knowledge: tambah kolom 'content' (free-text) dan 'content_type'
   (enum: 'qa' | 'text') — question/answer tetap ada untuk entry lama.
2. chatbot_unanswered: tambah kolom 'embedding' vector(768) untuk dedup
   similarity check sebelum insert.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── chatbot_knowledge: tambah content_type dan content ──────────────────
    # content_type: 'qa' = format Q&A lama, 'text' = free-text baru
    op.add_column(
        'chatbot_knowledge',
        sa.Column('content_type', sa.String(10), nullable=False, server_default='qa'),
    )
    # content: teks bebas untuk entry type='text' (bisa null untuk entry Q&A lama)
    op.add_column(
        'chatbot_knowledge',
        sa.Column('content', sa.Text(), nullable=True),
    )
    # question dan answer sekarang nullable (untuk entry type='text')
    op.alter_column('chatbot_knowledge', 'question', nullable=True)
    op.alter_column('chatbot_knowledge', 'answer', nullable=True)

    # ── chatbot_unanswered: tambah embedding untuk dedup ─────────────────────
    op.execute(
        "ALTER TABLE chatbot_unanswered ADD COLUMN IF NOT EXISTS embedding vector(768)"
    )
    # Index untuk similarity search di unanswered
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_chatbot_unanswered_embedding "
        "ON chatbot_unanswered USING hnsw (embedding vector_cosine_ops) "
        "WHERE embedding IS NOT NULL AND is_resolved = false"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_chatbot_unanswered_embedding")
    op.execute("ALTER TABLE chatbot_unanswered DROP COLUMN IF EXISTS embedding")
    op.alter_column('chatbot_knowledge', 'answer', nullable=False)
    op.alter_column('chatbot_knowledge', 'question', nullable=False)
    op.drop_column('chatbot_knowledge', 'content')
    op.drop_column('chatbot_knowledge', 'content_type')
