from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from app.dominio.enums import EstadoSolicitudExtra


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


class SolicitudClaseExtraResponseDTO(BaseModel):
    id: int
    fecha_clase_solicitada: date
    estado: EstadoSolicitudExtra
    costo_adicional: Optional[Decimal] = None
    fecha_solicitud: datetime
    observaciones: Optional[str] = None
    persona_id: int
    membresia_id: int
    horario_id: int
    model_config = ConfigDict(from_attributes=True)
