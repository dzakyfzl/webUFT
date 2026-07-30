from sqlalchemy import and_, delete, select, update

from app.models import Akses, Akun, Bidang, Token
from app.repositories.base import BaseRepository


class AkunRepository(BaseRepository):
    def get_by_username(self, username: str):
        return self.db.execute(select(Akun).where(Akun.username == username)).scalar_one_or_none()

    def access_names(self, akun_id: int):
        stmt = select(Bidang.nama).join(Akses, Bidang.bidangID == Akses.bidangID).where(Akses.akunID == akun_id)
        return [row[0] for row in self.db.execute(stmt).all()]

    def store_login_token(self, akun_id: int, refresh_token: str):
        self.db.add(Token(tokenID=refresh_token))
        self.db.commit()
        self.db.execute(update(Akun).where(Akun.akunID == akun_id).values(tokenID=refresh_token))
        self.db.commit()

    def get_token(self, token: str):
        return self.db.execute(select(Token).where(Token.tokenID == token)).scalar_one_or_none()

    def clear_and_delete_token(self, token):
        self.db.execute(update(Akun).where(Akun.tokenID == token.tokenID).values(tokenID=None))
        self.db.delete(token)
        self.db.commit()

    def token_for_username(self, username: str):
        return self.db.execute(select(Akun.tokenID).where(Akun.username == username)).scalar_one_or_none()

    def create_account(self, username: str, hashed_password: str, salt: str):
        self.db.add(Akun(username=username, hashed_password=hashed_password, salt=salt, role="Admin"))
        self.db.commit()

    def list_accounts(self):
        return self.db.execute(select(Akun.akunID, Akun.username, Akun.role)).all()

    def access_for_account(self, akun_id: int):
        stmt = select(Bidang.nama, Bidang.bidangID).join(Akses, Bidang.bidangID == Akses.bidangID).where(Akses.akunID == akun_id)
        return self.db.execute(stmt).all()

    def get(self, akun_id: int):
        return self.db.execute(select(Akun).where(Akun.akunID == akun_id)).scalar_one_or_none()

    def delete_account(self, account):
        self.db.execute(delete(Akses).where(Akses.akunID == account.akunID))
        self.db.commit()
        self.db.delete(account)
        self.db.commit()

    def get_access(self, akun_id: int, bidang_id: int):
        stmt = select(Akses).where(and_(Akses.akunID == akun_id, Akses.bidangID == bidang_id))
        return self.db.execute(stmt).scalar_one_or_none()

    def create_access(self, akun_id: int, bidang_id: int):
        self.db.add(Akses(akunID=akun_id, bidangID=bidang_id))
        self.db.commit()

    def delete_access(self, access):
        self.db.delete(access)
        self.db.commit()
