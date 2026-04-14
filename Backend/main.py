from dotenv import load_dotenv
from fastapi import FastAPI
import os
import hashlib

from fastapi.concurrency import asynccontextmanager
from Database.database import engine
from Database import models
from Router import acara, karya, akun, file, form
models.Base.metadata.create_all(bind=engine)

load_dotenv()

app = FastAPI(root_path="/api", docs_url="/docs")
app.include_router(acara.router)
app.include_router(akun.router)
app.include_router(file.router)
app.include_router(karya.router)
app.include_router(form.router)