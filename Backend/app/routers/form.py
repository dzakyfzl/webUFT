from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response, StreamingResponse

from app.core.security import validate_token, verify_is_guest
from app.routers.helpers import apply_result
from app.schemas.form import FormCreate
from app.services.dependencies import get_form_service
from app.services.form_service import FormService

router = APIRouter(prefix="/form", tags=["Form"])


@router.post("/isi/{acara_id}")
def isi_form(acara_id: int, isi: FormCreate, isGuest: Annotated[str, Depends(verify_is_guest)], response: Response, service: FormService = Depends(get_form_service)):
    return apply_result(service.submit(acara_id, isi, isGuest), response)


@router.get("/list/{acara_id}")
def list_responden(acara_id: int, response: Response, user: Annotated[str, Depends(validate_token)], service: FormService = Depends(get_form_service)):
    return apply_result(service.list(acara_id, user), response)


@router.get("/urutkan-karya/{acara_id}")
def urutkan_karya(acara_id: int, response: Response, user: Annotated[str, Depends(validate_token)], service: FormService = Depends(get_form_service)):
    return apply_result(service.ranked(acara_id, user), response)


@router.get("/download-csv/{acara_id}")
def download_csv(acara_id: int, response: Response, user: Annotated[str, Depends(validate_token)], service: FormService = Depends(get_form_service)):
    result = service.csv_export(acara_id, user)
    response.status_code = result.status_code
    if result.status_code != 200:
        return result.payload
    return StreamingResponse(iter([result.payload["content"]]), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{result.payload["filename"]}"'})
