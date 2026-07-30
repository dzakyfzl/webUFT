from app.models import Akses, Akun, Bidang
from app.repositories.base import BaseRepository


class BootstrapRepository(BaseRepository):
    @staticmethod
    def create_schema(engine, metadata):
        metadata.create_all(bind=engine)

    def bidang_count(self):
        return self.db.query(Bidang).count()

    def add_bidang(self, item: dict):
        self.db.add(Bidang(**item))

    def account_count(self):
        return self.db.query(Akun).count()

    def add_admin(self, username: str, hashed_password: str, salt: str):
        entity = Akun(username=username, hashed_password=hashed_password, salt=salt, role="Admin")
        self.db.add(entity)
        self.db.commit()
        return entity

    def all_bidang(self):
        return self.db.query(Bidang).all()

    def add_access(self, akun_id: int, bidang_id: int):
        self.db.add(Akses(akunID=akun_id, bidangID=bidang_id))
