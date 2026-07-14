from pydantic import BaseModel, ConfigDict, Field, model_validator
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from app.dominio.enums import EstadoMembresia, TipoModalidad, EstadoPago, TipoPago


# --- TipoMembresia ---
class TipoMembresiaCreateDTO(BaseModel):
    categoria: str
    franja_horaria: str
    precio: Decimal = Field(..., gt=0)
    modalidad: TipoModalidad


class TipoMembresiaResponseDTO(TipoMembresiaCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Membresia ---
# El `estado` y `fecha_activacion` NO se exponen al cliente: la máquina de
# estados de Membresia requiere flujo por Pago (INACTIVA -> ACTIVA al aprobar
# un pago). Permitir setearlos desde el payload era un bypass (B-12).
class MembresiaCreateDTO(BaseModel):
    monto_aplicado: Decimal = Field(..., gt=0)
    persona_id: int
    tipo_membresia_id: int


class MembresiaResponseDTO(BaseModel):
    id: int
    estado: EstadoMembresia
    monto_aplicado: Decimal
    fecha_activacion: datetime
    persona_id: int
    tipo_membresia_id: int
    model_config = ConfigDict(from_attributes=True)


# --- Pago ---
class PagoCreateDTO(BaseModel):
    monto: Decimal = Field(..., gt=0)
    tipo_pago: TipoPago
    fecha_inicio: date
    fecha_fin: date
    persona_id: int
    membresia_id: int

    @model_validator(mode="after")
    def _orden_fechas(self) -> "PagoCreateDTO":
        if self.fecha_inicio >= self.fecha_fin:
            raise ValueError("fecha_inicio debe ser menor que fecha_fin")
        return self


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
    voucher_url: Optional[str] = None
    voucher_formato: Optional[str] = None
    voucher_fecha_carga: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# --- ComprobantePago ---
# `pago_id` NO va aquí: viene del path del endpoint
# (`POST /membresias/pagos/{pago_id}/comprobante`). Lo quitamos del DTO para
# evitar el `TypeError: got multiple values for keyword 'pago_id'` que ocurre
# al expandir `datos.model_dump()` y luego pasar `pago_id=pago_id`.
class ComprobantePagoCreateDTO(BaseModel):
    archivo_url: str
    formato_archivo: str


class ComprobantePagoResponseDTO(BaseModel):
    id: int
    archivo_url: str
    formato_archivo: str
    fecha_carga: datetime
    pago_id: int
    model_config = ConfigDict(from_attributes=True)
