from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.infraestructura.db import obtener_sesion
from app.presentacion.schemas.clase_extra_schemas import (
    SolicitudClaseExtraCreateDTO, SolicitudClaseExtraResponseDTO, SolicitudClaseExtraResolverDTO,
)
from app.seguridad.gestor_auth import GestorAutenticacion
from app.servicios_negocio.clase_extra_servicio import ClaseExtraServicio
from app.servicios_negocio.gestor_permisos import GestorPermisos

router = APIRouter(prefix="/clases-extra", tags=["Clases Extra (Membresía Personalizada)"])


# Solicitar una clase extra: un alumno autenticado puede pedirla para sí mismo.
# La validación de propiedad (membresía pertenece a la persona) vive en el servicio.
@router.post(
    "/",
    response_model=SolicitudClaseExtraResponseDTO,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def solicitar_clase_extra(datos: SolicitudClaseExtraCreateDTO, db: Session = Depends(obtener_sesion)):
    return ClaseExtraServicio(db).solicitar_clase_extra(datos)


@router.patch(
    "/{solicitud_id}/resolver", response_model=SolicitudClaseExtraResponseDTO,
    dependencies=[Depends(GestorPermisos(["ADMINISTRADOR"]))],
)
async def resolver_solicitud(solicitud_id: int, datos: SolicitudClaseExtraResolverDTO, db: Session = Depends(obtener_sesion)):
    return ClaseExtraServicio(db).resolver_solicitud(solicitud_id, datos)


# Historial por persona: cualquier autenticado puede leer (no expone datos
# sensibles, sólo solicitudes state-managed; pero ya no es público anónimo).
@router.get(
    "/persona/{persona_id}",
    response_model=List[SolicitudClaseExtraResponseDTO],
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def listar_solicitudes_persona(persona_id: int, db: Session = Depends(obtener_sesion)):
    return ClaseExtraServicio(db).listar_por_persona(persona_id)
