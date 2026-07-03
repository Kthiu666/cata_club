from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.infraestructura.db import obtener_sesion
from app.dominio.modelos import Asistencia, HorarioEntrenamiento, Persona
from app.presentacion.schemas.asistencia_schemas import (
    AsistenciaCreateDTO, AsistenciaResponseDTO, HorarioCreateDTO, HorarioResponseDTO,
)
from app.servicios_negocio.gestor_permisos import GestorPermisos

router = APIRouter(prefix="/asistencias", tags=["Asistencias"])


@router.post("/horarios", response_model=HorarioResponseDTO, status_code=201,
             dependencies=[Depends(GestorPermisos(["ADMINISTRADOR", "ENTRENADOR"]))])
async def crear_horario(datos: HorarioCreateDTO, db: Session = Depends(obtener_sesion)):
    if datos.hora_inicio >= datos.hora_fin:
        raise HTTPException(status_code=400, detail="La hora de inicio debe ser anterior a la hora de fin")
    horario = HorarioEntrenamiento(**datos.model_dump())
    db.add(horario)
    db.commit()
    db.refresh(horario)
    return horario


@router.get("/horarios", response_model=List[HorarioResponseDTO])
async def listar_horarios(db: Session = Depends(obtener_sesion)):
    return db.query(HorarioEntrenamiento).all()


@router.post("/", response_model=AsistenciaResponseDTO, status_code=201,
             dependencies=[Depends(GestorPermisos(["ADMINISTRADOR", "ENTRENADOR"]))])
async def registrar_asistencia(datos: AsistenciaCreateDTO, db: Session = Depends(obtener_sesion)):
    if not db.get(Persona, datos.persona_id):
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    if not db.get(HorarioEntrenamiento, datos.horario_id):
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    asistencia = Asistencia(**datos.model_dump())
    db.add(asistencia)
    db.commit()
    db.refresh(asistencia)
    return asistencia


@router.get("/persona/{persona_id}", response_model=List[AsistenciaResponseDTO])
async def historial_asistencia_persona(persona_id: int, db: Session = Depends(obtener_sesion)):
    persona = db.get(Persona, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return persona.asistencias
