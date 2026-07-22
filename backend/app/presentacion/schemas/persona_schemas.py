from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List

from app.dominio.enums import TipoEscuela, NivelTecnicoAlumno, TipoSangre, TipoManoDominante
from app.presentacion.schemas.base import ResponseBase


# --- Institucion ---
class InstitucionCreateDTO(BaseModel):
    nombre: str = Field(..., max_length=150)
    tipo_escuela: TipoEscuela


class InstitucionResponseDTO(ResponseBase, InstitucionCreateDTO):
    id: int


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
    # E01-RF009 / E01-RF011: permiten asignar etiquetas directamente en el alta.
    prioridad_municipal: Optional[bool] = False
    porcentaje_beca: Optional[int] = Field(default=0, ge=0, le=100)
    motivo_beca: Optional[str] = Field(default=None, max_length=150)


class PersonaUpdateDTO(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    telefono: Optional[str] = None
    telefono_contacto: Optional[str] = None
    foto_url: Optional[str] = None
    direccion_id: Optional[int] = None
    institucion_id: Optional[int] = None
    # E01-RF009: etiqueta informativa, sin efecto en facturación.
    prioridad_municipal: Optional[bool] = None
    # E01-RF011: porcentaje de 0 (sin beca) a 100 (exoneración total).
    porcentaje_beca: Optional[int] = Field(default=None, ge=0, le=100)
    motivo_beca: Optional[str] = Field(default=None, max_length=150)


class PersonaResponseDTO(ResponseBase, BaseModel):
    id: int = Field(..., examples=[1])
    nombres: str = Field(..., examples=["Juan Carlos"])
    apellidos: str = Field(..., examples=["Pérez López"])
    cedula: str = Field(..., examples=["1710034065"])
    fecha_nacimiento: date = Field(..., examples=["1990-05-14"])
    foto_url: Optional[str] = Field(default=None, examples=["https://res.cloudinary.com/..."])
    telefono: str = Field(..., examples=["0991234567"])
    telefono_contacto: Optional[str] = Field(default=None, examples=["0998765432"])
    representante_id: Optional[int] = Field(default=None, examples=[None])
    prioridad_municipal: bool = Field(default=False, examples=[False])
    porcentaje_beca: int = Field(default=0, examples=[0])
    motivo_beca: Optional[str] = Field(default=None, examples=[None])
    fecha_registro: Optional[datetime] = Field(default=None, examples=["2024-01-15T10:30:00Z"])


# --- AntecedentesClub ---
class AntecedentesClubCreateDTO(BaseModel):
    nivel_tecnico_alumno: NivelTecnicoAlumno
    fecha_inicio_club: date
    persona_id: int
    mano_dominante: Optional[TipoManoDominante] = None


class AntecedentesClubUpdateDTO(BaseModel):
    nivel_tecnico_alumno: Optional[NivelTecnicoAlumno] = None
    mano_dominante: Optional[TipoManoDominante] = None


class AntecedentesClubResponseDTO(ResponseBase, AntecedentesClubCreateDTO):
    id: int


# --- FichaMedica / Enfermedades ---
class EnfermedadCreateDTO(BaseModel):
    nombre_enfermedad: str = Field(..., max_length=150)


class EnfermedadResponseDTO(ResponseBase, EnfermedadCreateDTO):
    id: int


class FichaMedicaCreateDTO(BaseModel):
    tipo_sangre: TipoSangre
    persona_id: int
    enfermedades: List[str] = Field(default_factory=list)  # nombres de enfermedades, opcional
    alergias: Optional[str] = Field(default=None, max_length=255)
    contacto_emergencia: Optional[str] = Field(default=None, max_length=150)
    telefono_emergencia: Optional[str] = Field(default=None, max_length=15)


class FichaMedicaUpdateDTO(BaseModel):
    """Todos los campos opcionales: PATCH parcial. Si `enfermedades` viene
    presente, REEMPLAZA la lista completa (no hace merge/append) — es más
    predecible para el frontend que un merge implícito."""
    tipo_sangre: Optional[TipoSangre] = None
    enfermedades: Optional[List[str]] = None
    alergias: Optional[str] = Field(default=None, max_length=255)
    contacto_emergencia: Optional[str] = Field(default=None, max_length=150)
    telefono_emergencia: Optional[str] = Field(default=None, max_length=15)


class FichaMedicaResponseDTO(ResponseBase, BaseModel):
    id: int
    tipo_sangre: TipoSangre
    persona_id: int
    enfermedades: List[EnfermedadResponseDTO] = []
    alergias: Optional[str] = None
    contacto_emergencia: Optional[str] = None
    telefono_emergencia: Optional[str] = None
