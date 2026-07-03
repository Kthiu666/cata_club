from __future__ import annotations

from typing import List, Optional

from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infraestructura.db import Base


class Pais(Base):
    __tablename__ = "pais"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)

    provincias: Mapped[List["Provincia"]] = relationship(back_populates="pais")


class Provincia(Base):
    __tablename__ = "provincia"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)

    pais_id: Mapped[int] = mapped_column(ForeignKey("pais.id"), nullable=False)
    pais: Mapped["Pais"] = relationship(back_populates="provincias")

    cantones: Mapped[List["Canton"]] = relationship(back_populates="provincia")


class Canton(Base):
    __tablename__ = "canton"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)

    provincia_id: Mapped[int] = mapped_column(ForeignKey("provincia.id"), nullable=False)
    provincia: Mapped["Provincia"] = relationship(back_populates="cantones")

    direcciones: Mapped[List["Direccion"]] = relationship(back_populates="canton")


class Direccion(Base):
    __tablename__ = "direccion"

    id: Mapped[int] = mapped_column(primary_key=True)
    barrio: Mapped[str] = mapped_column(String(100), nullable=False)
    calle_principal: Mapped[str] = mapped_column(String(100), nullable=False)
    calle_secundaria: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    numero_casa: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    canton_id: Mapped[int] = mapped_column(ForeignKey("canton.id"), nullable=False)
    canton: Mapped["Canton"] = relationship(back_populates="direcciones")

    # Relación 1-1 con Persona (persona.direccion_id es la FK "dueña")
    persona: Mapped[Optional["Persona"]] = relationship(back_populates="direccion")
