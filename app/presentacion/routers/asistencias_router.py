from fastapi import APIRouter, Depends, status
from typing import List

from app.presentacion.dependencias import obtener_asistencia_service
from app.presentacion.schemas.asistencia_schemas import (
    AsistenciaCreateDTO, AsistenciaResponseDTO, HorarioCreateDTO, HorarioResponseDTO,
)
from app.servicios_negocio.gestor_permisos import GestorPermisos
from app.servicios_negocio.asistencia_service import AsistenciaService

router = APIRouter(prefix="/asistencias", tags=["Asistencias"])


@router.post("/horarios", response_model=HorarioResponseDTO, status_code=201,
             dependencies=[Depends(GestorPermisos(["ADMINISTRADOR", "ENTRENADOR"]))])
async def crear_horario(
    datos: HorarioCreateDTO,
    service: AsistenciaService = Depends(obtener_asistencia_service),
):
    return service.crear_horario(datos)


@router.get("/horarios", response_model=List[HorarioResponseDTO])
async def listar_horarios(service: AsistenciaService = Depends(obtener_asistencia_service)):
    return service.listar_horarios()


@router.post("/", response_model=AsistenciaResponseDTO, status_code=201,
             dependencies=[Depends(GestorPermisos(["ADMINISTRADOR", "ENTRENADOR"]))])
async def registrar_asistencia(
    datos: AsistenciaCreateDTO,
    service: AsistenciaService = Depends(obtener_asistencia_service),
):
    return service.registrar_asistencia(datos)


@router.get("/persona/{persona_id}", response_model=List[AsistenciaResponseDTO])
async def historial_asistencia_persona(
    persona_id: int,
    service: AsistenciaService = Depends(obtener_asistencia_service),
):
    return service.historial_asistencia_persona(persona_id)