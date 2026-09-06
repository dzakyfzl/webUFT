"""Repository for Aspirasi Settings dan Riwayat."""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.hr.aspirasi import AspirasiSettings, AspirasiRiwayat
from app.repositories.base import BaseRepository


class AspirasiRepository(BaseRepository):

    # ---- Settings (singleton) ----

    def get_settings(self) -> Optional[AspirasiSettings]:
        return self.db.query(AspirasiSettings).filter(AspirasiSettings.id == 1).first()

    def upsert_settings(self, updated_by: int, **kwargs) -> AspirasiSettings:
        entity = self.db.query(AspirasiSettings).filter(AspirasiSettings.id == 1).first()
        if entity is None:
            entity = AspirasiSettings(id=1, updated_by=updated_by, **kwargs)
            self.db.add(entity)
        else:
            for key, value in kwargs.items():
                if value is not None:
                    setattr(entity, key, value)
            entity.updated_by = updated_by
        self.db.commit()
        self.db.refresh(entity)
        return entity

    # ---- Riwayat ----

    def get_riwayat(self, bulan: int, tahun: int) -> Optional[AspirasiRiwayat]:
        return (
            self.db.query(AspirasiRiwayat)
            .filter(
                AspirasiRiwayat.bulan == bulan,
                AspirasiRiwayat.tahun == tahun,
            )
            .first()
        )

    def list_riwayat(self, tahun: Optional[int] = None, skip: int = 0, limit: int = 24) -> list[AspirasiRiwayat]:
        query = self.db.query(AspirasiRiwayat)
        if tahun:
            query = query.filter(AspirasiRiwayat.tahun == tahun)
        return query.order_by(AspirasiRiwayat.tahun.desc(), AspirasiRiwayat.bulan.desc()).offset(skip).limit(limit).all()

    def ensure_riwayat_bulan_ini(self) -> AspirasiRiwayat:
        """Pastikan record riwayat bulan berjalan tersedia (buat jika belum ada)."""
        now = datetime.utcnow()
        bulan, tahun = now.month, now.year
        existing = self.get_riwayat(bulan, tahun)
        if existing:
            return existing
        r = AspirasiRiwayat(bulan=bulan, tahun=tahun, status="Belum Dikirim")
        self.db.add(r)
        self.db.commit()
        self.db.refresh(r)
        return r

    def mark_sent(self, bulan: int, tahun: int, dikirim_oleh: int, link_rekap: Optional[str] = None) -> Optional[AspirasiRiwayat]:
        entity = self.get_riwayat(bulan, tahun)
        if entity is None:
            return None
        entity.status = "Terkirim"
        entity.dikirim_oleh = dikirim_oleh
        entity.dikirim_pada = datetime.utcnow()
        if link_rekap:
            entity.link_rekap = link_rekap
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def mark_overdue_riwayat(self) -> int:
        """Set status Overdue untuk bulan-bulan yang lewat dan belum dikirim."""
        now = datetime.utcnow()
        entities = (
            self.db.query(AspirasiRiwayat)
            .filter(
                AspirasiRiwayat.status == "Belum Dikirim",
                # overdue jika bulan sudah lewat atau di-akhir bulan
                AspirasiRiwayat.tahun < now.year
                | (
                    (AspirasiRiwayat.tahun == now.year)
                    & (AspirasiRiwayat.bulan < now.month)
                ),
            )
            .all()
        )
        for e in entities:
            e.status = "Overdue"
        if entities:
            self.db.commit()
        return len(entities)
