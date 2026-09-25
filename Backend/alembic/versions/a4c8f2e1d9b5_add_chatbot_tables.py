"""add chatbot tables and pgvector extension

Revision ID: a4c8f2e1d9b5
Revises: f8a2d1c9b3e7
Create Date: 2026-09-25 06:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4c8f2e1d9b5'
down_revision: Union[str, Sequence[str], None] = 'f8a2d1c9b3e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Buat tabel chatbot Angie: API key pool, knowledge base (pgvector),
    unanswered questions, conversation log, dan config.
    """
    # Aktifkan extension pgvector — harus ada sebelum tipe vector dipakai
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ── chatbot_api_key ──────────────────────────────────────────────────────
    op.create_table(
        "chatbot_api_key",
        sa.Column("id",             sa.Integer(),      primary_key=True, autoincrement=True),
        sa.Column("label",          sa.String(100),    nullable=False),
        sa.Column("encrypted_key",  sa.LargeBinary(),  nullable=False),
        sa.Column("nonce",          sa.LargeBinary(),  nullable=False),
        sa.Column("tag",            sa.LargeBinary(),  nullable=False),
        sa.Column("key_preview",    sa.String(20),     nullable=False),
        sa.Column("status",         sa.String(20),     nullable=False, server_default="active"),
        sa.Column("priority",       sa.Integer(),      nullable=False, server_default="0"),
        sa.Column("fail_count",     sa.Integer(),      nullable=False, server_default="0"),
        sa.Column("last_used_at",   sa.DateTime(),     nullable=True),
        sa.Column("last_failed_at", sa.DateTime(),     nullable=True),
        sa.Column("cooldown_until", sa.DateTime(),     nullable=True),
        sa.Column("total_requests", sa.Integer(),      nullable=False, server_default="0"),
        sa.Column("created_at",     sa.DateTime(),     server_default=sa.text("now()")),
    )

    # ── chatbot_knowledge ────────────────────────────────────────────────────
    op.create_table(
        "chatbot_knowledge",
        sa.Column("id",         sa.Integer(),   primary_key=True, autoincrement=True),
        sa.Column("category",   sa.String(100), nullable=False),
        sa.Column("question",   sa.Text(),      nullable=False),
        sa.Column("answer",     sa.Text(),      nullable=False),
        sa.Column("is_active",  sa.Boolean(),   nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(),  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(),  nullable=True),
    )
    # Tambah kolom vector(768) via raw DDL — pgvector tidak punya native SA type
    op.execute(
        "ALTER TABLE chatbot_knowledge ADD COLUMN embedding vector(768)"
    )
    # Index cosine similarity (HNSW — performa terbaik untuk query ANN)
    op.execute(
        "CREATE INDEX idx_chatbot_knowledge_embedding "
        "ON chatbot_knowledge USING hnsw (embedding vector_cosine_ops)"
    )

    # ── chatbot_unanswered ───────────────────────────────────────────────────
    op.create_table(
        "chatbot_unanswered",
        sa.Column("id",                    sa.Integer(),  primary_key=True, autoincrement=True),
        sa.Column("question",              sa.Text(),     nullable=False),
        sa.Column("user_ip",               sa.String(50), nullable=True),
        sa.Column("asked_at",              sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("is_resolved",           sa.Boolean(),  nullable=False, server_default="false"),
        sa.Column("resolved_knowledge_id", sa.Integer(),  sa.ForeignKey("chatbot_knowledge.id"), nullable=True),
    )

    # ── chatbot_conversation ─────────────────────────────────────────────────
    op.create_table(
        "chatbot_conversation",
        sa.Column("id",         sa.Integer(),    primary_key=True, autoincrement=True),
        sa.Column("session_id", sa.String(100),  nullable=False, index=True),
        sa.Column("role",       sa.String(10),   nullable=False),
        sa.Column("content",    sa.Text(),       nullable=False),
        sa.Column("created_at", sa.DateTime(),   server_default=sa.text("now()")),
    )
    op.create_index("idx_chatbot_conversation_session", "chatbot_conversation", ["session_id"])

    # ── chatbot_config ───────────────────────────────────────────────────────
    op.create_table(
        "chatbot_config",
        sa.Column("id",                sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("daily_token_limit", sa.Integer(), nullable=False, server_default="1000000"),
        sa.Column("tokens_used_today", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_reset_date",   sa.DateTime(), nullable=True),
        sa.Column("is_active",         sa.Boolean(), nullable=False, server_default="true"),
    )
    # Seed baris konfigurasi default
    op.execute(
        "INSERT INTO chatbot_config (daily_token_limit, tokens_used_today, is_active) "
        "VALUES (1000000, 0, true)"
    )


def downgrade() -> None:
    """Hapus semua tabel chatbot dan extension pgvector."""
    op.drop_table("chatbot_config")
    op.drop_index("idx_chatbot_conversation_session", table_name="chatbot_conversation")
    op.drop_table("chatbot_conversation")
    op.drop_table("chatbot_unanswered")
    op.drop_index("idx_chatbot_knowledge_embedding", table_name="chatbot_knowledge")
    op.drop_table("chatbot_knowledge")
    op.drop_table("chatbot_api_key")
    op.execute("DROP EXTENSION IF EXISTS vector")
