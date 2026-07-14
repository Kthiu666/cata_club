from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.infraestructura.db import obtener_sesion
from app.presentacion.schemas.asistencia_schemas import (
    AsistenciaCreateDTO, AsistenciaResponseDTO, HorarioCreateDTO, HorarioResponseDTO,
)
from app.seguridad.gestor_auth import GestorAutenticacion
from app.servicios_negocio.asistencia_servicio import AsistenciaServicio
from app.servicios_negocio.gestor_permisos import GestorPermisos

router = APIRouter(prefix="/asistencias", tags=["Asistencias"])


@router.post("/horarios", response_model=HorarioResponseDTO, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(GestorPermisos(["ADMINISTRADOR", "ENTRENADOR"]))])
async def crear_horario(datos: HorarioCreateDTO, db: Session = Depends(obtener_sesion)):
    return AsistenciaServicio(db).crear_horario(datos)


# Listado de horarios: lectura para cualquier autenticado (no anónimo).
@router.get(
    "/horarios",
    response_model=List[HorarioResponseDTO],
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def listar_horarios(db: Session = Depends(obtener_sesion)):
    return AsistenciaServicio(db).listar_horarios()


@router.post("/", response_model=AsistenciaResponseDTO, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(GestorPermisos(["ADMINISTRADOR", "ENTRENADOR"]))])
async def registrar_asistencia(datos: AsistenciaCreateDTO, db: Session = Depends(obtener_sesion)):
    return AsistenciaServicio(db).registrar_asistencia(datos)


# Historial de asistencia de una persona: dato sensible (presencia/régimen),
# requiere autenticación (no anónimo).
@router.get(
    "/persona/{persona_id}",
    response_model=List[AsistenciaResponseDTO],
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def historial_asistencia_persona(persona_id: int, db: Session = Depends(obtener_sesion)):
    return AsistenciaServicio(db).historial_por_persona(persona_id)
