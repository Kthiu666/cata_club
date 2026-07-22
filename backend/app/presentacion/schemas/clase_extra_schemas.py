from pydantic import BaseModel, Field
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from app.dominio.enums import EstadoSolicitudExtra
from app.presentacion.schemas.base import ResponseBase


class SolicitudClaseExtraListItemDTO(ResponseBase, BaseModel):
    """Versión enriquecida para el panel administrativo: incluye nombre del
    solicitante y datos del horario para que el admin no tenga que hacer
    N+1 llamadas."""
    id: int
    fecha_clase_solicitada: date
    estado: EstadoSolicitudExtra
    costo_adicional: Optional[Decimal] = None
    fecha_solicitud: datetime
    observaciones: Optional[str] = None
    persona_id: int
    persona_nombre_completo: str
    membresia_id: int
    horario_id: int
    horario_dia_semana: str
    horario_hora_inicio: str
    horario_hora_fin: str


class SolicitudClaseExtraCreateDTO(BaseModel):
    """El alumno (o quien registre en su nombre) solicita una clase adicional.
    Solo válido si su membresía es de modalidad PERSONALIZADA -- se valida en
    el servicio de negocio, no aquí."""
    fecha_clase_solicitada: date
    persona_id: int
    membresia_id: int
    horario_id: int
    observaciones: Optional[str] = Field(None, max_length=255)


class SolicitudClaseExtraResolverDTO(BaseModel):
    """El administrador aprueba o rechaza la solicitud."""
    estado: EstadoSolicitudExtra
    costo_adicional: Optional[Decimal] = None
    observaciones: Optional[str] = Field(None, max_length=255)


class SolicitudClaseExtraResponseDTO(ResponseBase, BaseModel):
    id: int
    fecha_clase_solicitada: date
    estado: EstadoSolicitudExtra
    costo_adicional: Optional[Decimal] = None
    fecha_solicitud: datetime
    observaciones: Optional[str] = None
    persona_id: int
    membresia_id: int
    horario_id: int
