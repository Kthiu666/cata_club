from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from typing import Optional, List

from app.dominio.enums import TipoEscuela, NivelTecnicoAlumno, TipoSangre


# --- Institucion ---
class InstitucionCreateDTO(BaseModel):
    nombre: str = Field(..., max_length=150)
    tipo_escuela: TipoEscuela


class InstitucionResponseDTO(InstitucionCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Persona ---
class PersonaCreateDTO(BaseModel):
    nombres: str = Field(..., max_length=100)
    apellidos: str = Field(..., max_length=100)
    cedula: str = Field(..., min_length=10, max_length=10)
    fecha_nacimiento: date
    foto_url: Optional[str] = None
    telefono: str
    telefono_contacto: Optional[str] = None
    representante_id: Optional[int] = None
    direccion_id: Optional[int] = None
    institucion_id: Optional[int] = None


class PersonaUpdateDTO(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    telefono: Optional[str] = None
    telefono_contacto: Optional[str] = None
    foto_url: Optional[str] = None
    direccion_id: Optional[int] = None
    institucion_id: Optional[int] = None


class PersonaResponseDTO(BaseModel):
    id: int
    nombres: str
    apellidos: str
    cedula: str
    fecha_nacimiento: date
    foto_url: Optional[str] = None
    telefono: str
    telefono_contacto: Optional[str] = None
    representante_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# --- AntecedentesClub ---
class AntecedentesClubCreateDTO(BaseModel):
    nivel_tecnico_alumno: NivelTecnicoAlumno
    fecha_inicio_club: date
    persona_id: int


class AntecedentesClubResponseDTO(AntecedentesClubCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- FichaMedica / Enfermedades ---
class EnfermedadCreateDTO(BaseModel):
    nombre_enfermedad: str = Field(..., max_length=150)


class EnfermedadResponseDTO(EnfermedadCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)


class FichaMedicaCreateDTO(BaseModel):
    tipo_sangre: TipoSangre
    persona_id: int
    enfermedades: List[str] = Field(default_factory=list)  # nombres de enfermedades, opcional


class FichaMedicaUpdateDTO(BaseModel):
    """Todos los campos opcionales: PATCH parcial. Si `enfermedades` viene
    presente, REEMPLAZA la lista completa (no hace merge/append) — es más
    predecible para el frontend que un merge implícito."""
    tipo_sangre: Optional[TipoSangre] = None
    enfermedades: Optional[List[str]] = None


class FichaMedicaResponseDTO(BaseModel):
    id: int
    tipo_sangre: TipoSangre
    persona_id: int
    enfermedades: List[EnfermedadResponseDTO] = []
    model_config = ConfigDict(from_attributes=True)
