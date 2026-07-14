from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.infraestructura.db import obtener_sesion
from app.presentacion.schemas.persona_schemas import (
    PersonaCreateDTO, PersonaResponseDTO, PersonaUpdateDTO,
)
from app.seguridad.gestor_auth import GestorAutenticacion
from app.servicios_negocio.persona_servicio import PersonaServicio
from app.servicios_negocio.gestor_permisos import GestorPermisos

router = APIRouter(prefix="/personas", tags=["Personas"])


@router.post(
    "/", response_model=PersonaResponseDTO, status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(GestorPermisos(["ADMINISTRADOR"]))],
)
async def registrar_persona(persona_in: PersonaCreateDTO, db: Session = Depends(obtener_sesion)):
    return PersonaServicio(db).registrar_persona(persona_in)


# --- GETs: requieren token válido (no rol específico) para no exponer
# datos sensibles (cédula, teléfono, fecha de nacimiento) a cualquier cliente
# sin autenticar. Lo protegemos en el router, no sólo en el servicio.
@router.get(
    "/",
    response_model=List[PersonaResponseDTO],
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def listar_personas(skip: int = 0, limit: int = 50, db: Session = Depends(obtener_sesion)):
    return PersonaServicio(db).listar_personas(skip, limit)


@router.get(
    "/{persona_id}",
    response_model=PersonaResponseDTO,
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def obtener_persona(persona_id: int, db: Session = Depends(obtener_sesion)):
    return PersonaServicio(db).obtener_persona(persona_id)


@router.get(
    "/{persona_id}/representados",
    response_model=List[PersonaResponseDTO],
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def listar_representados(persona_id: int, db: Session = Depends(obtener_sesion)):
    return PersonaServicio(db).listar_representados(persona_id)


@router.put(
    "/{persona_id}", response_model=PersonaResponseDTO,
    dependencies=[Depends(GestorPermisos(["ADMINISTRADOR"]))],
)
async def actualizar_persona(persona_id: int, cambios: PersonaUpdateDTO, db: Session = Depends(obtener_sesion)):
    return PersonaServicio(db).actualizar_persona(persona_id, cambios)


@router.delete(
    "/{persona_id}", status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(GestorPermisos(["ADMINISTRADOR"]))],
)
async def eliminar_persona(persona_id: int, db: Session = Depends(obtener_sesion)):
    PersonaServicio(db).eliminar_persona(persona_id)
