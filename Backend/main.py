from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.database import SessionLocal
from app.repositories.bootstrap_repository import BootstrapRepository
from app.routers import acara, akun, album, file, form, foto, karya, shortlink
from app.services.bootstrap_service import BootstrapService

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        BootstrapService(BootstrapRepository(db)).initialize("bidang.json")
        yield
    finally:
        db.close()
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
app.include_router(shortlink.router)
