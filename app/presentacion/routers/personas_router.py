from fastapi import APIRouter, Depends, status
from typing import List

from app.presentacion.dependencias import obtener_persona_service
from app.presentacion.schemas.persona_schemas import (
    PersonaCreateDTO, PersonaResponseDTO, PersonaUpdateDTO,
)
from app.servicios_negocio.gestor_permisos import GestorPermisos
from app.servicios_negocio.persona_service import PersonaService

router = APIRouter(prefix="/personas", tags=["Personas"])


@router.post(
    "/", response_model=PersonaResponseDTO, status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(GestorPermisos(["ADMINISTRADOR"]))],
)
async def registrar_persona(
    persona_in: PersonaCreateDTO,
    service: PersonaService = Depends(obtener_persona_service),
):
    return service.registrar_persona(persona_in)


@router.get("/", response_model=List[PersonaResponseDTO])
async def listar_personas(
    skip: int = 0, limit: int = 50,
    service: PersonaService = Depends(obtener_persona_service),
):
    return service.listar_personas(skip, limit)


@router.get("/{persona_id}", response_model=PersonaResponseDTO)
async def obtener_persona(
    persona_id: int,
    service: PersonaService = Depends(obtener_persona_service),
):
    return service.obtener_persona(persona_id)


@router.get("/{persona_id}/representados", response_model=List[PersonaResponseDTO])
async def listar_representados(
    persona_id: int,
    service: PersonaService = Depends(obtener_persona_service),
):
    return service.listar_representados(persona_id)


@router.put(
    "/{persona_id}", response_model=PersonaResponseDTO,
    dependencies=[Depends(GestorPermisos(["ADMINISTRADOR"]))],
)
async def actualizar_persona(
    persona_id: int, cambios: PersonaUpdateDTO,
    service: PersonaService = Depends(obtener_persona_service),
):
    return service.actualizar_persona(persona_id, cambios)


@router.delete(
    "/{persona_id}", status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(GestorPermisos(["ADMINISTRADOR"]))],
)
async def eliminar_persona(
    persona_id: int,
    service: PersonaService = Depends(obtener_persona_service),
):
    service.eliminar_persona(persona_id)