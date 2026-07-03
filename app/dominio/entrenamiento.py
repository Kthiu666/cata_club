from __future__ import annotations

import datetime
from typing import List, Optional

from sqlalchemy import Time, Date, DateTime, String, Boolean, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infraestructura.db import Base
from app.dominio.enums import LicenciaEntrenador, EstadoAsistencia


class HorarioEntrenamiento(Base):
    __tablename__ = "horario_entrenamiento"

    id: Mapped[int] = mapped_column(primary_key=True)
    hora_inicio: Mapped[datetime.time] = mapped_column(Time, nullable=False)
    hora_fin: Mapped[datetime.time] = mapped_column(Time, nullable=False)
    licencia_entrenador: Mapped[LicenciaEntrenador] = mapped_column(nullable=False)

    # Entrenador (Persona) que tiene este horario
    entrenador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("persona.id"), nullable=True)
    entrenador: Mapped[Optional["Persona"]] = relationship(back_populates="horarios_entrenamiento")

    asistencias: Mapped[List["Asistencia"]] = relationship(back_populates="horario_entrenamiento")


class Asistencia(Base):
    __tablename__ = "asistencia"

    id: Mapped[int] = mapped_column(primary_key=True)
    fecha_entrenamiento: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    fecha_registro: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
    justificativo: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    estado_justificativo: Mapped[bool] = mapped_column(Boolean, default=False)
    estado_asistencia: Mapped[EstadoAsistencia] = mapped_column(nullable=False)

    horario_entrenamiento_id: Mapped[int] = mapped_column(
        ForeignKey("horario_entrenamiento.id"), nullable=False
    )
    horario_entrenamiento: Mapped["HorarioEntrenamiento"] = relationship(back_populates="asistencias")

    # Alumno (Persona) que registra la asistencia
    persona_id: Mapped[int] = mapped_column(ForeignKey("persona.id"), nullable=False)
    persona: Mapped["Persona"] = relationship(back_populates="asistencias")
