from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from decimal import Decimal
from typing import Optional, List

from app.dominio.enums import TipoMovimientoEvento


# --- Eventos de recaudación (E04-RF010) --------------------------------------
class EventoRecaudacionCreateDTO(BaseModel):
    nombre: str = Field(..., max_length=150)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    meta_monto: Optional[Decimal] = Field(default=None, gt=0)


class EventoRecaudacionResponseDTO(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    meta_monto: Optional[Decimal] = None
    model_config = ConfigDict(from_attributes=True)


# --- Movimientos de un evento (E04-RF011) ------------------------------------
class MovimientoEventoCreateDTO(BaseModel):
    tipo: TipoMovimientoEvento
    monto: Decimal = Field(..., gt=0)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    fecha: date


class MovimientoEventoResponseDTO(BaseModel):
    id: int
    tipo: TipoMovimientoEvento
    monto: Decimal
    descripcion: Optional[str] = None
    fecha: date
    evento_id: int
    registrado_por_id: int
    model_config = ConfigDict(from_attributes=True)


class BalanceEventoResponseDTO(BaseModel):
    evento_id: int
    nombre: str
    total_ingresos: Decimal
    total_egresos: Decimal
    balance: Decimal
    meta_monto: Optional[Decimal] = None


# --- Egresos generales del club (E04-RF009) ----------------------------------
class EgresoCreateDTO(BaseModel):
    concepto: str = Field(..., max_length=150)
    categoria: str = Field(..., max_length=80)
    monto: Decimal = Field(..., gt=0)
    fecha: date


class EgresoResponseDTO(BaseModel):
    id: int
    concepto: str
    categoria: str
    monto: Decimal
    fecha: date
    registrado_por_id: int
    model_config = ConfigDict(from_attributes=True)


# --- Balance general del club (E04-RF012 / E04-RF013) ------------------------
class BalanceGeneralResponseDTO(BaseModel):
    total_ingresos_membresias: Decimal
    total_ingresos_eventos: Decimal
    total_egresos_eventos: Decimal
    total_egresos_generales: Decimal
    balance_neto: Decimal
