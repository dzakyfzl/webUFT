from sqlalchemy import delete, select

from app.models import ShortLink
from app.repositories.base import BaseRepository


class ShortLinkRepository(BaseRepository):
    def create(self, **values):
        entity = ShortLink(**values)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def get(self, link_id: int):
        return self.db.execute(
            select(ShortLink).where(ShortLink.linkID == link_id)
        ).scalar_one_or_none()

    def get_by_slug(self, slug: str):
        return self.db.execute(
            select(ShortLink).where(ShortLink.slug == slug)
        ).scalar_one_or_none()

    def get_all(self):
        return self.db.execute(select(ShortLink)).scalars().all()

    def delete(self, link_id: int):
        return self.db.execute(delete(ShortLink).where(ShortLink.linkID == link_id))