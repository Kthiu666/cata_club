from __future__ import annotations

import datetime
from typing import List, Optional

from sqlalchemy import String, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infraestructura.db import Base
from app.dominio.enums import NivelTecnicoAlumno, TipoEscuela


class Institucion(Base):
    __tablename__ = "institucion"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    # NOTA: el diagrama vincula el enum TipoEscuela a Institucion pero no se ve
    # el nombre exacto del atributo en la imagen. Confirma con tu equipo si es
    # este campo o si va en otra entidad.
    tipo_escuela: Mapped[Optional[TipoEscuela]] = mapped_column(nullable=True)

    personas: Mapped[List["Persona"]] = relationship(back_populates="institucion")


class AntecedentesClub(Base):
    __tablename__ = "antecedentes_club"

    id: Mapped[int] = mapped_column(primary_key=True)
    nivel_tecnico_alumno: Mapped[NivelTecnicoAlumno] = mapped_column(nullable=False)
    fecha_inicio_club: Mapped[datetime.date] = mapped_column(Date, nullable=False)

    persona_id: Mapped[int] = mapped_column(ForeignKey("persona.id"), unique=True, nullable=False)
    persona: Mapped["Persona"] = relationship(back_populates="antecedentes_club")


class Persona(Base):
    __tablename__ = "persona"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombres: Mapped[str] = mapped_column(String(100), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(100), nullable=False)
    cedula: Mapped[str] = mapped_column(String(10), nullable=False, unique=True)
    fecha_nacimiento: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    foto_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    telefono_contacto: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # --- Relación 1-1 con Direccion ---
    direccion_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("direccion.id"), unique=True, nullable=True
    )
    direccion: Mapped[Optional["Direccion"]] = relationship(back_populates="persona")

    # --- Relación reflexiva: un adulto "representa" a 0..* personas ---
    representante_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("persona.id"), nullable=True
    )
    representante: Mapped[Optional["Persona"]] = relationship(
        remote_side="Persona.id", back_populates="representados"
    )
    representados: Mapped[List["Persona"]] = relationship(back_populates="representante")

    # --- Institución educativa (0..1 Institucion -- 1..* Persona) ---
    institucion_id: Mapped[Optional[int]] = mapped_column(ForeignKey("institucion.id"), nullable=True)
    institucion: Mapped[Optional["Institucion"]] = relationship(back_populates="personas")

    # --- Antecedentes en el club (0..1) ---
    antecedentes_club: Mapped[Optional["AntecedentesClub"]] = relationship(
        back_populates="persona", uselist=False
    )

    # --- Usuario asociado (1-1) ---
    usuario: Mapped[Optional["Usuario"]] = relationship(back_populates="persona", uselist=False)

    # --- Membresías que posee ---
    membresias: Mapped[List["Membresia"]] = relationship(back_populates="persona")

    # --- Horarios de entrenamiento que tiene (si es entrenador) ---
    horarios_entrenamiento: Mapped[List["HorarioEntrenamiento"]] = relationship(
        back_populates="entrenador"
    )

    # --- Asistencias que registra (si es alumno) ---
    asistencias: Mapped[List["Asistencia"]] = relationship(back_populates="persona")

    # --- Ficha médica que posee (0..1) ---
    ficha_medica: Mapped[Optional["FichaMedica"]] = relationship(
        back_populates="persona", uselist=False
    )

    # --- Pagos que registra ---
    pagos: Mapped[List["Pago"]] = relationship(back_populates="persona")
