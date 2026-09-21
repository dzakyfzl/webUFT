from typing import Annotated
from fastapi import APIRouter, Depends, UploadFile, Response
from fastapi.responses import FileResponse

from app.core.security import validate_token
from app.routers.helpers import apply_result
from app.services.dependencies import get_migrate_service
from app.services.migrate_service import MigrateService

router = APIRouter(prefix="/migrate", tags=["Migrate"])

@router.get("/export")
async def export_media(
    user: Annotated[dict, Depends(validate_token)], 
    service: MigrateService = Depends(get_migrate_service)
):
    result = service.exportData(user)
    if result.status_code != 200:
        # Assuming you have a way to handle errors if apply_result isn't used directly here for file response
        return result.payload
        
    return FileResponse(
        path=result.payload["filepath"], 
        media_type="application/zip", 
        filename=result.payload["filename"]
    )

@router.post("/import")
async def import_media(
    file: UploadFile, 
    response: Response, 
    user: Annotated[dict, Depends(validate_token)], 
    service: MigrateService = Depends(get_migrate_service)
):
    return apply_result(await service.importData(file, user), response)

@router.get("/")
async def get_migration_history(
    user: Annotated[dict, Depends(validate_token)],
    response: Response,
    id: int = 0,
    service: MigrateService = Depends(get_migrate_service)
):
    return apply_result(await service.get(user=user,id=id),response)
