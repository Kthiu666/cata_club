"""
DTOs de autenticación.

Patrón de nomenclatura consistente con el resto de schemas del proyecto:
  - Sufijo `CreateDTO` para payloads de entrada,
  - Sufijo `ResponseDTO` para respuestas, con `model_config = ConfigDict(from_attributes=True)`
    cuando la respuesta se mapea directamente desde un modelo ORM.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

from app.presentacion.schemas.base import ResponseBase


class RegistroUsuarioDTO(BaseModel):
    """Payload del endpoint público POST /auth/registro.

    Regla de diseño confirmada: solo se crea el `Usuario` (credenciales) para
    una `Persona` que YA existe (dada de alta antes por un ADMINISTRADOR vía
    POST /personas). No se crea Persona aquí.
    """
    cedula: str = Field(..., min_length=10, max_length=10)
    correo: EmailStr
    contrasenia: str = Field(..., min_length=8)


class LoginResponseDTO(ResponseBase, BaseModel):
    access_token: str = Field(..., examples=["eyJhbGciOiJIUzI1NiIs..."])
    refresh_token: str = Field(..., examples=["dGhpcyBpcyBhIHJlZnJlc2g..."])
    token_type: str = "bearer"


class RefreshTokenDTO(BaseModel):
    refresh_token: str


class UsuarioMeResponseDTO(ResponseBase, BaseModel):
    correo: str
    persona_id: int
    nombres: str
    apellidos: str
    roles: List[str]
    telefono: str


class LogoutResponseDTO(ResponseBase, BaseModel):
    mensaje: str


# --- Issue #36: perfil propio (self-service) --------------------------------
class ActualizarPerfilPropioDTO(BaseModel):
    """Payload de PATCH /auth/me. Ambos campos son opcionales (edición
    parcial); solo los campos presentes en el request se actualizan
    (`exclude_unset=True` en el servicio)."""
    correo: Optional[EmailStr] = None
    telefono: Optional[str] = Field(default=None, max_length=15)


class ActualizarPerfilPropioResponseDTO(ResponseBase, BaseModel):
    correo: str
    persona_id: int
    nombres: str
    apellidos: str
    roles: List[str]
    telefono: str
    access_token: Optional[str] = None
    """Presente SOLO si `correo` cambió (el `sub` del JWT es el correo; sin
    reemisión, el access token vigente del usuario dejaría de resolver a su
    cuenta en el próximo request)."""
    refresh_token: Optional[str] = None


# --- E01-RF003: recuperación de contraseña ----------------------------------
class SolicitarRecuperacionDTO(BaseModel):
    correo: EmailStr


class SolicitarRecuperacionResponseDTO(ResponseBase, BaseModel):
    mensaje: str


class RestablecerContraseniaDTO(BaseModel):
    token: str
    nueva_contrasenia: str = Field(..., min_length=8)
