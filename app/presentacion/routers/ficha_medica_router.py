from fastapi import APIRouter, Depends

from app.presentacion.dependencias import obtener_ficha_medica_service
from app.presentacion.schemas.persona_schemas import FichaMedicaCreateDTO, FichaMedicaResponseDTO
from app.servicios_negocio.ficha_medica_service import FichaMedicaService

router = APIRouter(prefix="/fichas-medicas", tags=["Ficha Médica"])


@router.post("/", response_model=FichaMedicaResponseDTO, status_code=201)
async def crear_ficha_medica(
    datos: FichaMedicaCreateDTO,
    service: FichaMedicaService = Depends(obtener_ficha_medica_service),
):
    return service.crear_ficha_medica(datos)


@router.get("/persona/{persona_id}", response_model=FichaMedicaResponseDTO)
async def obtener_ficha_por_persona(
    persona_id: int,
    service: FichaMedicaService = Depends(obtener_ficha_medica_service),
):
    return service.obtener_ficha_por_persona(persona_id)