from __future__ import annotations

from typing import List

from sqlalchemy import String, ForeignKey, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infraestructura.db import Base
from app.dominio.enums import TipoSangre

# Relación N:M entre FichaMedica y Enfermedad (1..* -- 0..*)
ficha_medica_enfermedad = Table(
    "ficha_medica_enfermedad",
    Base.metadata,
    Column("ficha_medica_id", ForeignKey("ficha_medica.id"), primary_key=True),
    Column("enfermedad_id", ForeignKey("enfermedad.id"), primary_key=True),
)


class FichaMedica(Base):
    __tablename__ = "ficha_medica"

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo_sangre: Mapped[TipoSangre] = mapped_column(nullable=False)

    persona_id: Mapped[int] = mapped_column(ForeignKey("persona.id"), unique=True, nullable=False)
    persona: Mapped["Persona"] = relationship(back_populates="ficha_medica")

    enfermedades: Mapped[List["Enfermedad"]] = relationship(
        secondary=ficha_medica_enfermedad, back_populates="fichas_medicas"
    )


class Enfermedad(Base):
    __tablename__ = "enfermedad"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre_enfermedad: Mapped[str] = mapped_column(String(150), nullable=False)

    fichas_medicas: Mapped[List["FichaMedica"]] = relationship(
        secondary=ficha_medica_enfermedad, back_populates="enfermedades"
    )
