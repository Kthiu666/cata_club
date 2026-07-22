from pydantic import BaseModel
from datetime import date, time, datetime
from typing import Optional

from app.dominio.enums import EstadoAsistencia, DiaSemana
from app.presentacion.schemas.base import ResponseBase


class HorarioCreateDTO(BaseModel):
    dia_semana: DiaSemana
    hora_inicio: time
    hora_fin: time
    entrenador_id: int
    nivel_ranking_id: Optional[int] = None


class HorarioUpdateDTO(BaseModel):
    dia_semana: Optional[DiaSemana] = None
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    entrenador_id: Optional[int] = None
    nivel_ranking_id: Optional[int] = None


class HorarioResponseDTO(ResponseBase, HorarioCreateDTO):
    id: int


class AsistenciaCreateDTO(BaseModel):
    fecha_entrenamiento: date
    estado: EstadoAsistencia
    justificativo: Optional[str] = None
    estado_justificativo: Optional[bool] = None
    persona_id: int
    entrenador_id: int
    horario_id: int


class AsistenciaResponseDTO(ResponseBase, BaseModel):
    id: int
    fecha_entrenamiento: date
    fecha_registro: datetime
    estado: EstadoAsistencia
    justificativo: Optional[str] = None
    estado_justificativo: Optional[bool] = None
    persona_id: int
    entrenador_id: int
    horario_id: int


# --- Asignación directa Alumno ↔ Horario ------------------------------------
class AlumnoHorarioCreateDTO(BaseModel):
    persona_id: int
    horario_id: int


class AlumnoHorarioResponseDTO(ResponseBase, BaseModel):
    id: int
    persona_id: int
    horario_id: int
    fecha_asignacion: datetime


class AlumnoHorarioDetalleDTO(ResponseBase, BaseModel):
    """DTO con información de persona y horario para listados."""
    id: int
    persona_id: int
    persona_nombre_completo: str
    horario_id: int
    horario_dia: DiaSemana
    horario_hora_inicio: time
    horario_hora_fin: time
    fecha_asignacion: datetime
