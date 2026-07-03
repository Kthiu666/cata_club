from __future__ import annotations

import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import String, Numeric, DateTime, Date, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infraestructura.db import Base
from app.dominio.enums import EstadoMembresia, TipoModalidad, EstadoPago, TipoPago


class TipoMembresia(Base):
    __tablename__ = "tipo_membresia"

    id: Mapped[int] = mapped_column(primary_key=True)
    categoria: Mapped[str] = mapped_column(String(100), nullable=False)
    franja_horaria: Mapped[str] = mapped_column(String(100), nullable=False)
    precio: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    modalidad: Mapped[TipoModalidad] = mapped_column(nullable=False)

    membresias: Mapped[List["Membresia"]] = relationship(back_populates="tipo_membresia")


class Membresia(Base):
    __tablename__ = "membresia"

    id: Mapped[int] = mapped_column(primary_key=True)
    monto_aplicado: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    fecha_activacion: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    estado: Mapped[EstadoMembresia] = mapped_column(nullable=False, default=EstadoMembresia.PENDIENTE_PAGO)

    persona_id: Mapped[int] = mapped_column(ForeignKey("persona.id"), nullable=False)
    persona: Mapped["Persona"] = relationship(back_populates="membresias")

    tipo_membresia_id: Mapped[int] = mapped_column(ForeignKey("tipo_membresia.id"), nullable=False)
    tipo_membresia: Mapped["TipoMembresia"] = relationship(back_populates="membresias")

    # Agregación: una Membresia posee 0..* Pago
    pagos: Mapped[List["Pago"]] = relationship(back_populates="membresia")


class Pago(Base):
    __tablename__ = "pago"

    id: Mapped[int] = mapped_column(primary_key=True)
    monto: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    motivo_rechazo: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    fecha_registro: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
    fecha_validacion: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    fecha_inicio: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    estado_pago: Mapped[EstadoPago] = mapped_column(nullable=False, default=EstadoPago.PENDIENTE_VALIDACION)
    tipo_pago: Mapped[TipoPago] = mapped_column(nullable=False)

    membresia_id: Mapped[int] = mapped_column(ForeignKey("membresia.id"), nullable=False)
    membresia: Mapped["Membresia"] = relationship(back_populates="pagos")

    persona_id: Mapped[int] = mapped_column(ForeignKey("persona.id"), nullable=False)
    persona: Mapped["Persona"] = relationship(back_populates="pagos")

    comprobante: Mapped[Optional["ComprobantePago"]] = relationship(
        back_populates="pago", uselist=False
    )


class ComprobantePago(Base):
    __tablename__ = "comprobante_pago"

    id: Mapped[int] = mapped_column(primary_key=True)
    archivo_url: Mapped[str] = mapped_column(String(255), nullable=False)
    formato_archivo: Mapped[str] = mapped_column(String(20), nullable=False)
    fecha_carga: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    pago_id: Mapped[int] = mapped_column(ForeignKey("pago.id"), unique=True, nullable=False)
    pago: Mapped["Pago"] = relationship(back_populates="comprobante")
