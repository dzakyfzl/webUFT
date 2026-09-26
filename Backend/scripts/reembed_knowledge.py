#!/usr/bin/env python3
"""Re-embed seluruh knowledge base dengan strategi baru (Step 6 RAG improvement).

Jalankan SETELAH mengubah _build_embedding_text_for_knowledge() di chatbot_service.py.
Script ini membaca semua knowledge dari DB, generate ulang embedding dengan strategi baru,
lalu update DB.

Usage (di dalam container atau environment dengan DATABASE_URL aktif):
    cd Backend && python scripts/reembed_knowledge.py [--dry-run]

Options:
    --dry-run   Tampilkan teks yang akan di-embed tanpa mengubah DB.
"""
import argparse
import logging
import os
import sys

# Pastikan PYTHONPATH ke root Backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-embed knowledge base dengan strategi baru.")
    parser.add_argument("--dry-run", action="store_true", help="Preview teks tanpa update DB.")
    args = parser.parse_args()

    try:
        from app.core.database import SessionLocal
        from app.repositories.chatbot_repository import ChatbotRepository
        from app.services.chatbot_service import ChatbotService
    except ImportError as e:
        logger.error("Gagal import app modules: %s", e)
        sys.exit(1)

    db = SessionLocal()
    try:
        repo = ChatbotRepository(db)
        service = ChatbotService(db)

        items, total = repo.list_knowledge(limit=9999)
        logger.info("Ditemukan %d knowledge entries untuk di-re-embed.", total)

        if args.dry_run:
            logger.info("=== DRY RUN MODE — tidak ada perubahan DB ===")
            for item in items:
                embed_text = service._build_embedding_text_for_knowledge(
                    content_type=item.content_type or "qa",
                    question=item.question,
                    answer=item.answer,
                    content=item.content,
                )
                logger.info(
                    "[id=%d] type=%s | embed_text='%.120s'",
                    item.id, item.content_type, embed_text,
                )
            return

        success = 0
        failed = 0
        for item in items:
            try:
                new_embedding = service.generate_embedding_for_knowledge(
                    content_type=item.content_type or "qa",
                    question=item.question,
                    answer=item.answer,
                    content=item.content,
                )
                repo.update_knowledge(item.id, {}, embedding=new_embedding)
                logger.info(
                    "[id=%d] OK re-embedded: '%.60s'",
                    item.id, (item.question or item.content or ""),
                )
                success += 1
            except Exception:
                logger.exception("[id=%d] GAGAL re-embed", item.id)
                failed += 1

        logger.info(
            "=== Re-embed selesai: %d sukses, %d gagal dari %d total ===",
            success, failed, total,
        )
        if failed > 0:
            sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    main()
