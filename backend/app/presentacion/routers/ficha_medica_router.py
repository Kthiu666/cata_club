from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.infraestructura.db import obtener_sesion
from app.presentacion.schemas.persona_schemas import (
    FichaMedicaCreateDTO, FichaMedicaResponseDTO, FichaMedicaUpdateDTO,
)
from app.servicios_negocio.ficha_medica_servicio import FichaMedicaServicio
from app.servicios_negocio.gestor_permisos import GestorPermisos

router = APIRouter(prefix="/fichas-medicas", tags=["Ficha Médica"])

# Ficha médica = dato de salud sensible: tanto la escritura como la lectura
# se restringen a ADMINISTRADOR (el alumno no debería poder leer la ficha de
# otro, ni escribir la suya sin control). Es una decisión del router, no del
# servicio, coherente con el resto del proyecto.
ROL_ADMIN = ["ADMINISTRADOR"]


@router.post(
    "/",
    response_model=FichaMedicaResponseDTO,
    status_code=201,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def crear_ficha_medica(datos: FichaMedicaCreateDTO, db: Session = Depends(obtener_sesion)):
    return FichaMedicaServicio(db).crear_ficha_medica(datos)


@router.get(
    "/persona/{persona_id}",
    response_model=FichaMedicaResponseDTO,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def obtener_ficha_por_persona(persona_id: int, db: Session = Depends(obtener_sesion)):
    return FichaMedicaServicio(db).obtener_por_persona(persona_id)


# Antes solo se podía crear una vez; no había forma de corregir un tipo de
# sangre mal registrado o actualizar la lista de enfermedades.
@router.patch(
    "/persona/{persona_id}",
    response_model=FichaMedicaResponseDTO,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def actualizar_ficha_medica(persona_id: int, datos: FichaMedicaUpdateDTO, db: Session = Depends(obtener_sesion)):
    return FichaMedicaServicio(db).actualizar_por_persona(persona_id, datos)
