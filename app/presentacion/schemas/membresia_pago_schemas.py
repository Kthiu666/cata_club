from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from app.dominio.enums import EstadoMembresia, TipoModalidad, EstadoPago, TipoPago


# --- TipoMembresia ---
class TipoMembresiaCreateDTO(BaseModel):
    categoria: str
    franja_horaria: str
    precio: Decimal
    modalidad: TipoModalidad


class TipoMembresiaResponseDTO(TipoMembresiaCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Membresia ---
class MembresiaCreateDTO(BaseModel):
    estado: EstadoMembresia = EstadoMembresia.PENDIENTE_PAGO
    monto_aplicado: Decimal
    fecha_activacion: datetime
    persona_id: int
    tipo_membresia_id: int


class MembresiaResponseDTO(MembresiaCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Pago ---
class PagoCreateDTO(BaseModel):
    monto: Decimal
    tipo_pago: TipoPago
    fecha_inicio: date
    fecha_fin: date
    persona_id: int
    membresia_id: int


class PagoValidarDTO(BaseModel):
    estado_pago: EstadoPago
    motivo_rechazo: Optional[str] = Field(None, max_length=255)


class PagoResponseDTO(BaseModel):
    id: int
    monto: Decimal
    motivo_rechazo: Optional[str] = None
    estado_pago: EstadoPago
    tipo_pago: TipoPago
    fecha_registro: datetime
    fecha_validacion: Optional[datetime] = None
    fecha_inicio: date
    fecha_fin: date
    persona_id: int
    membresia_id: int
    model_config = ConfigDict(from_attributes=True)


# --- ComprobantePago ---
class ComprobantePagoCreateDTO(BaseModel):
    archivo_url: str
    formato_archivo: str
    pago_id: int


class ComprobantePagoResponseDTO(ComprobantePagoCreateDTO):
    id: int
    fecha_carga: datetime
    model_config = ConfigDict(from_attributes=True)
