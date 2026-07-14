from pydantic import BaseModel, ConfigDict
from datetime import date, time, datetime
from typing import Optional

from app.dominio.enums import EstadoAsistencia, DiaSemana


class HorarioCreateDTO(BaseModel):
    dia_semana: DiaSemana
    hora_inicio: time
    hora_fin: time
    entrenador_id: int


class HorarioResponseDTO(HorarioCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AsistenciaCreateDTO(BaseModel):
    fecha_entrenamiento: date
    estado: EstadoAsistencia
    justificativo: Optional[str] = None
    estado_justificativo: Optional[bool] = None
    persona_id: int
    entrenador_id: int
    horario_id: int


class AsistenciaResponseDTO(BaseModel):
    id: int
    fecha_entrenamiento: date
    fecha_registro: datetime
    estado: EstadoAsistencia
    justificativo: Optional[str] = None
    estado_justificativo: Optional[bool] = None
    persona_id: int
    entrenador_id: int
    horario_id: int
    model_config = ConfigDict(from_attributes=True)
