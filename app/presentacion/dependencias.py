from fastapi import Depends
from sqlalchemy.orm import Session

from app.infraestructura.db import obtener_sesion
from app.infraestructura.repositorios.persona_repositorio import PersonaRepositorio
from app.infraestructura.repositorios.asistencia_repositorio import AsistenciaRepositorio
from app.infraestructura.repositorios.membresia_repositorio import MembresiaRepositorio
from app.infraestructura.repositorios.ficha_medica_repositorio import FichaMedicaRepositorio

from app.servicios_negocio.persona_service import PersonaService
from app.servicios_negocio.asistencia_service import AsistenciaService
from app.servicios_negocio.membresia_service import MembresiaService
from app.servicios_negocio.ficha_medica_service import FichaMedicaService


def obtener_persona_service(db: Session = Depends(obtener_sesion)) -> PersonaService:
    return PersonaService(PersonaRepositorio(db))


def obtener_asistencia_service(db: Session = Depends(obtener_sesion)) -> AsistenciaService:
    return AsistenciaService(AsistenciaRepositorio(db), PersonaRepositorio(db))


def obtener_membresia_service(db: Session = Depends(obtener_sesion)) -> MembresiaService:
    return MembresiaService(MembresiaRepositorio(db), PersonaRepositorio(db))


def obtener_ficha_medica_service(db: Session = Depends(obtener_sesion)) -> FichaMedicaService:
    return FichaMedicaService(FichaMedicaRepositorio(db), PersonaRepositorio(db))