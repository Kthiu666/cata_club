from __future__ import annotations

import datetime
from typing import List, Optional

from sqlalchemy import String, DateTime, ForeignKey, Table, Column, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infraestructura.db import Base

# Tabla de asociación N:M entre Usuario y Rol (1..* Rol -- 0..* Usuario)
usuario_rol = Table(
    "usuario_rol",
    Base.metadata,
    Column("usuario_id", ForeignKey("usuario.id"), primary_key=True),
    Column("rol_id", ForeignKey("rol.id"), primary_key=True),
)


class Rol(Base):
    __tablename__ = "rol"

    id: Mapped[int] = mapped_column(primary_key=True)
    descripcion: Mapped[str] = mapped_column(String(50), nullable=False)  # ALUMNO / ENTRENADOR / ADMINISTRADOR

    usuarios: Mapped[List["Usuario"]] = relationship(secondary=usuario_rol, back_populates="roles")


class Usuario(Base):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(primary_key=True)
    correo: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    contrasenia: Mapped[str] = mapped_column(String(255), nullable=False)  # hash, nunca texto plano
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    persona_id: Mapped[int] = mapped_column(ForeignKey("persona.id"), unique=True, nullable=False)
    persona: Mapped["Persona"] = relationship(back_populates="usuario")

    roles: Mapped[List["Rol"]] = relationship(secondary=usuario_rol, back_populates="usuarios")
