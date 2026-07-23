"""
DTOs del endpoint público de autoinscripción (Escenario 2, Opción B).

Permite al representante (o al alumno adulto) inscribirse directamente desde
el wizard del frontend sin intervención del administrador. El endpoint orquesta
la creación de Persona, Usuario, FichaMedica y AntecedentesClub en un solo
request transaccional, y retorna tokens JWT para auto-login inmediato.
"""
from pydantic import BaseModel, Field, EmailStr
from datetime import date
from typing import Optional, List

from app.dominio.enums import TipoSangre, NivelTecnicoAlumno, TipoManoDominante


class EnrollmentRepresentanteDTO(BaseModel):
    """Datos del representante legal (solo para inscripción de hijo/dependiente)."""
    nombres: str = Field(..., max_length=100)
    apellidos: str = Field(..., max_length=100)
    cedula: str = Field(..., min_length=10, max_length=10)
    fecha_nacimiento: date
    telefono: str = Field(..., max_length=15)
    correo: EmailStr
    contrasenia: str = Field(..., min_length=8)


class EnrollmentAlumnoDTO(BaseModel):
    """Datos del alumno a inscribir."""
    nombres: str = Field(..., max_length=100)
    apellidos: str = Field(..., max_length=100)
    cedula: str = Field(..., min_length=10, max_length=10)
    fecha_nacimiento: date
    telefono: str = Field(..., max_length=15)


class EnrollmentCredencialesDTO(BaseModel):
    """Credenciales del alumno para autoinscripción sin representante (adulto)."""
    correo: EmailStr
    contrasenia: str = Field(..., min_length=8)


class EnrollmentFichaMedicaDTO(BaseModel):
    """Ficha médica del alumno (opcional). tipo_sangre default DESCONOCIDO."""
    tipo_sangre: TipoSangre = TipoSangre.DESCONOCIDO
    enfermedades: List[str] = Field(default_factory=list)
    alergias: Optional[str] = Field(default=None, max_length=255)
    contacto_emergencia: Optional[str] = Field(default=None, max_length=150)
    telefono_emergencia: Optional[str] = Field(default=None, max_length=15)


class EnrollmentAntecedentesDTO(BaseModel):
    """Antecedentes del club (opcional). Si no se provee nivel_tecnico_alumno,
    no se crean antecedentes (el entrenador los asignará después)."""
    fecha_inicio_club: Optional[date] = None
    nivel_tecnico_alumno: Optional[NivelTecnicoAlumno] = None
    mano_dominante: Optional[TipoManoDominante] = None


class EnrollmentCreateDTO(BaseModel):
    """
    Payload completo de autoinscripción pública (sin auth).

    - Inscripción "self" (jugador adulto): omitir `representante`,
      incluir `credenciales_alumno`.
    - Inscripción "child" (representante inscribe hijo):
      incluir `representante` con credenciales.
    """
    representante: Optional[EnrollmentRepresentanteDTO] = None
    alumno: EnrollmentAlumnoDTO
    credenciales_alumno: Optional[EnrollmentCredencialesDTO] = None
    ficha_medica: Optional[EnrollmentFichaMedicaDTO] = None
    antecedentes: Optional[EnrollmentAntecedentesDTO] = None


class EnrollmentResponseDTO(BaseModel):
    """Respuesta exitosa de autoinscripción: tokens JWT + persona_id."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    persona_id: int
