from pydantic import BaseModel, ConfigDict
from typing import Optional


class PaisDTO(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)


class ProvinciaCreateDTO(BaseModel):
    nombre: str
    pais_id: int


class ProvinciaResponseDTO(ProvinciaCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)


class CantonCreateDTO(BaseModel):
    nombre: str
    provincia_id: int


class CantonResponseDTO(CantonCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)


class DireccionCreateDTO(BaseModel):
    barrio: str
    calle_principal: str
    calle_secundaria: Optional[str] = None
    numero_casa: Optional[str] = None
    canton_id: int


class DireccionResponseDTO(DireccionCreateDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)
