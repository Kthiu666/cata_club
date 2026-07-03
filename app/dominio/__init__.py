"""
Centraliza el import de todos los modelos del dominio.

Esto es clave para que Alembic (autogenerate) "vea" todas las tablas
al hacer `from app.infraestructura.base import Base` en env.py.
"""
from app.dominio.enums import (  # noqa: F401
    NivelTecnicoAlumno,
    TipoRol,
    TipoEscuela,
    TipoSangre,
    LicenciaEntrenador,
    EstadoAsistencia,
    EstadoMembresia,
    TipoModalidad,
    EstadoPago,
    TipoPago,
)
from app.dominio.ubicacion import Pais, Provincia, Canton, Direccion  # noqa: F401
from app.dominio.usuario import Rol, Usuario, usuario_rol  # noqa: F401
from app.dominio.persona import Persona, Institucion, AntecedentesClub  # noqa: F401
from app.dominio.membresia import TipoMembresia, Membresia, Pago, ComprobantePago  # noqa: F401
from app.dominio.entrenamiento import HorarioEntrenamiento, Asistencia  # noqa: F401
from app.dominio.salud import FichaMedica, Enfermedad, ficha_medica_enfermedad  # noqa: F401
