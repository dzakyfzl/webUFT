from sqlalchemy import func, select

from app.models import Acara, Karya, Pilihan, Responden, Token
from app.repositories.base import BaseRepository


class FormRepository(BaseRepository):
    def submission_counts(self, token_id: str, nomor: str, nama: str, acara_id: int):
        token_count = self.db.execute(select(func.count("*")).select_from(Responden).where(Responden.tokenID == token_id, Responden.acaraID == acara_id)).scalar_one_or_none()
        number_count = self.db.execute(select(func.count("*")).select_from(Responden).where(Responden.nomor == nomor, Responden.acaraID == acara_id)).scalar_one_or_none()
        name_count = self.db.execute(select(func.count("*")).select_from(Responden).where(Responden.nama == nama, Responden.acaraID == acara_id)).scalar_one_or_none()
        return token_count, number_count, name_count

    def acara_status(self, acara_id: int):
        return self.db.execute(select(Acara.status).where(Acara.acaraID == acara_id)).scalar_one_or_none()

    def create_token(self, token: str):
        entity = Token(tokenID=token)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)

    def create_response_and_choice(self, acara_id: int, token: str, data):
        entity = Responden(acaraID=acara_id, nama=data.nama.lower(), prodi_instansi=data.prodi_instansi.lower(), nomor=data.nomor, nim=data.nim, tokenID=token)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        self.db.add(Pilihan(respID=entity.respID, karyaID=data.karyaID))
        self.db.commit()

    def list_respondens(self, acara_id: int):
        return self.db.execute(select(Responden).where(Responden.acaraID == acara_id)).scalars().all()

    def ranked_karya(self, acara_id: int):
        stmt = select(Karya.nama, Karya.karyaID, Karya.fileID, Karya.deskripsi, Karya.pemilik, func.count(Pilihan.karyaID).label("jumlah_pilihan")).join(Pilihan, Pilihan.karyaID == Karya.karyaID, isouter=True).where(Karya.acaraID == acara_id).group_by(Karya).order_by(func.count(Pilihan.karyaID).desc())
        return self.db.execute(stmt).all()

    def csv_rows(self, acara_id: int):
        stmt = select(Responden.nama, Responden.prodi_instansi, Responden.nomor, Responden.nim, Karya.nama.label("karya_nama")).join(Pilihan, Pilihan.respID == Responden.respID).join(Karya, Karya.karyaID == Pilihan.karyaID).where(Responden.acaraID == acara_id)
        return self.db.execute(stmt).all()

    def acara_name(self, acara_id: int):
        return self.db.execute(select(Acara.nama).where(Acara.acaraID == acara_id)).scalar_one_or_none()
