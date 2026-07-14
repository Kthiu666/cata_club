from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


# --- Pais ---
class PaisCreateDTO(BaseModel):
    nombre: str = Field(..., max_length=100)


class PaisResponseDTO(PaisCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ProvinciaDTO(BaseModel):
    id: int
    nombre: str
    pais_id: int
    model_config = ConfigDict(from_attributes=True)


# --- Provincia ---
class ProvinciaCreateDTO(BaseModel):
    nombre: str = Field(..., max_length=100)
    pais_id: int


class ProvinciaResponseDTO(ProvinciaCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Canton ---
class CantonCreateDTO(BaseModel):
    nombre: str = Field(..., max_length=100)
    provincia_id: int


class CantonResponseDTO(CantonCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Direccion ---
class DireccionCreateDTO(BaseModel):
    barrio: str
    calle_principal: str
    calle_secundaria: Optional[str] = None
    numero_casa: Optional[str] = None
    canton_id: int


class DireccionResponseDTO(DireccionCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)
