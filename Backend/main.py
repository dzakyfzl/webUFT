from dotenv import load_dotenv
from fastapi import FastAPI
import os
import hashlib

from fastapi.concurrency import asynccontextmanager
from flask import json
from Database.database import SessionLocal, engine
from Database import models
from Router import acara, karya, akun, file, form, album, foto
models.Base.metadata.create_all(bind=engine)

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()

    count_bidang = db.query(models.Bidang).count()
    count_bidang_in_json = len(json.load(open("bidang.json", "r")))
    if count_bidang < count_bidang_in_json:
        bidang_list = []
        with open("bidang.json", "r") as f:
            bidang_data = json.load(f)
            for item in bidang_data:
                bidang = models.Bidang(**item)
                bidang_list.append(bidang)
        for bidang in bidang_list:
            db.add(bidang)
        db.commit()

    count_accounts = db.query(models.Akun).count()
    if count_accounts == 0:
        default_username = os.getenv("ADMIN_USERNAME")
        default_password = os.getenv("ADMIN_PASSWORD")
        salt = os.urandom(32).hex() 
        hashed_password = hashlib.sha256((default_password + salt).encode()).hexdigest()
        admin_account = models.Akun(
            username=default_username,
            hashed_password=hashed_password,
            salt=salt,
            role="Admin"
        )
        db.add(admin_account)
        db.commit()

        for bidang in db.query(models.Bidang).all():
            akses = models.Akses(
                akunID=admin_account.akunID,
                bidangID=bidang.bidangID
            )
            db.add(akses)
        db.commit()
    yield
    print("App Shutdown")

app = FastAPI(root_path="/api", docs_url="/docs", lifespan=lifespan)

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}

app.include_router(acara.router)
app.include_router(akun.router)
app.include_router(file.router)
app.include_router(karya.router)
app.include_router(form.router)
app.include_router(album.router)
app.include_router(foto.router)
