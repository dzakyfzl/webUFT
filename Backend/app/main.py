from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.auth.router import router as auth_router
from app.config import Settings
from app.db import Database
from app.errors import ApiError
from app.organization.router import router as organization_router
from app.programs.router import router as programs_router
from app.programs.operations_router import router as operations_router
from app.work.router import router as tasks_router
from app.work.overview_router import router as overview_router
from app.organization.history_router import router as history_router
from app.runtime import settings as load_settings
from app.p1.finance import router as finance_router
from app.p1.inventory import router as inventory_router
from app.p1.events import router as events_router
from app.p1.public import router as public_router
from app.p1.links import router as links_router


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or load_settings()
    database = Database(config)

    @asynccontextmanager
    async def lifespan(app):
        yield
        database.close()

    app = FastAPI(title="webUFT ERP", version="1.0.0", lifespan=lifespan,
                  docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)
    app.state.settings = config
    app.state.database = database
    app.state.media_dir = config.media_dir

    @app.middleware("http")
    async def response_headers(request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/api/admin"):
            response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.exception_handler(ApiError)
    async def api_error(request, error):
        headers = {"Retry-After": str(config.login_window_seconds)} if error.status == 429 else None
        return JSONResponse(status_code=error.status, headers=headers,
                            content={"error": {"code": error.code, "message": error.message}})

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, error):
        # Pydantic input/context may contain a submitted password; exclude them.
        details = [{"location": list(e["loc"]), "message": e["msg"]} for e in error.errors()]
        return JSONResponse(status_code=422, content={"error": {"code": "validation",
                            "message": "Periksa kembali isian Anda.", "details": details}})

    @app.exception_handler(IntegrityError)
    async def integrity_error(request, error):
        return JSONResponse(status_code=409, content={"error": {"code": "integrity_conflict",
                            "message": "Data bertentangan dengan record yang sudah ada."}})

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request, error):
        return JSONResponse(status_code=503, content={"error": {"code": "database_unavailable",
                            "message": "Penyimpanan belum tersedia. Coba kembali nanti."}})

    @app.get("/api/health", tags=["health"])
    def health():
        return {"status": "ok"}

    @app.get("/api/ready", tags=["health"])
    def ready():
        with database.transaction() as session:
            session.execute(text("SELECT 1 FROM erp_ukm.periods LIMIT 1"))
        return {"status": "ready"}

    app.include_router(auth_router)
    app.include_router(organization_router)
    app.include_router(programs_router)
    app.include_router(operations_router)
    app.include_router(tasks_router)
    app.include_router(overview_router)
    app.include_router(history_router)
    for router in (finance_router, inventory_router, events_router, public_router, links_router):
        app.include_router(router)
    return app
