import hashlib
import json
import os

from app.repositories.bootstrap_repository import BootstrapRepository


class BootstrapService:
    def __init__(self, repository: BootstrapRepository):
        self.repository = repository

    def initialize(self, bidang_path: str):
        with open(bidang_path, "r") as handle:
            bidang_data = json.load(handle)
        if self.repository.bidang_count() < len(bidang_data):
            for item in bidang_data:
                self.repository.add_bidang(item)
            self.repository.commit()
        if self.repository.account_count() == 0:
            username = os.getenv("ADMIN_USERNAME")
            password = os.getenv("ADMIN_PASSWORD")
            salt = os.urandom(32).hex()
            hashed = hashlib.sha256((password + salt).encode()).hexdigest()
            admin = self.repository.add_admin(username, hashed, salt)
            for bidang in self.repository.all_bidang():
                self.repository.add_access(admin.akunID, bidang.bidangID)
            self.repository.commit()
