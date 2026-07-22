from fastapi import APIRouter, Depends, File, UploadFile, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.infraestructura.db import obtener_sesion
from app.dominio.enums import EstadoPago
from app.presentacion.schemas.membresia_pago_schemas import (
    MembresiaCreateDTO, MembresiaEstadisticasResponseDTO, MembresiaResponseDTO,
    PagoCreateDTO, PagoResponseDTO, PagoValidarDTO, PagoListItemDTO,
    ComprobantePagoCreateDTO, ComprobantePagoResponseDTO,
    TipoMembresiaCreateDTO, TipoMembresiaResponseDTO,
)
from app.presentacion.schemas.base import PaginatedResponse
from app.seguridad.gestor_auth import GestorAutenticacion
from app.servicios_negocio.membresia_pago_servicio import MembresiaServicio, PagoServicio
from app.servicios_negocio.gestor_permisos import GestorPermisos

router = APIRouter(prefix="/membresias", tags=["Membresías y Pagos"])

# Reutilizado para endpoints admin (mismo string que usaba el código original).
ROL_ADMIN = ["ADMINISTRADOR"]
# TESORERO está dado de baja del sistema (ver RolServicio.asignar_rol): ya no
# se le puede asignar a nadie, y a quien ya lo tuviera tampoco le sigue
# otorgando acceso acá. Se deja ADMINISTRADOR solo, sin quitar TESORERO del
# dominio -- reactivarlo es agregar el string de vuelta a esta lista.
ROL_ADMIN_O_TESORERO = ["ADMINISTRADOR"]


# --- TipoMembresia ---
@router.post("/tipos", response_model=TipoMembresiaResponseDTO, status_code=201,
             dependencies=[Depends(GestorPermisos(ROL_ADMIN))])
async def crear_tipo_membresia(datos: TipoMembresiaCreateDTO, db: Session = Depends(obtener_sesion)):
    return MembresiaServicio(db).crear_tipo_membresia(datos)


# Tipos de membresía son datos de catálogo: lectura para cualquier autenticado.
@router.get(
    "/tipos", response_model=List[TipoMembresiaResponseDTO],
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def listar_tipos_membresia(db: Session = Depends(obtener_sesion)):
    return MembresiaServicio(db).listar_tipos_membresia()


# --- Membresia ---
@router.post("/", response_model=MembresiaResponseDTO, status_code=201,
             dependencies=[Depends(GestorPermisos(ROL_ADMIN))])
async def crear_membresia(datos: MembresiaCreateDTO, db: Session = Depends(obtener_sesion)):
    return MembresiaServicio(db).crear_membresia(datos)


@router.get(
    "/",
    response_model=PaginatedResponse[MembresiaResponseDTO],
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def listar_membresias(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(obtener_sesion),
):
    """Listado paginado de todas las membresías. Agregado para resolver el
    N+1 en el dashboard (issue #4): en lugar de resolver cada membresía con
    una llamada individual, el dashboard puede obtenerlas todas de una vez."""
    items, total = MembresiaServicio(db).listar_membresias(skip=skip, limit=limit)
    return PaginatedResponse(items=items, total=total, skip=skip, limit=limit)


@router.get(
    "/persona/{persona_id}",
    response_model=List[MembresiaResponseDTO],
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def listar_membresias_por_persona(
    persona_id: int,
    db: Session = Depends(obtener_sesion),
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
):
    return MembresiaServicio(db).listar_membresias_por_persona(
        persona_id_objetivo=persona_id,
        persona_id_solicitante=token_payload.get("persona_id"),
        roles_solicitante=token_payload.get("roles", []),
    )


# --- Pago ---
# IMPORTANTE sobre el orden: este bloque de rutas de /pagos debe declararse
# ANTES de `GET /{membresia_id}` (más abajo). FastAPI/Starlette resuelve
# rutas en el orden en que se registran, y `/{membresia_id}` es un patrón
# genérico de un solo segmento que capturaría "GET /membresias/pagos"
# interpretando "pagos" como membresia_id (-> 422 al no poder parsearlo como
# int). Se descubrió este problema al agregar el listado de pagos.

# Cola de validación (Administrador). Gap identificado al integrar con el
# frontend: no existía ningún endpoint de listado; solo se podía consultar
# un pago a la vez por id. `estado_pago` es opcional para poder ver el
# historial completo, no solo pendientes.
@router.get(
    "/pagos",
    response_model=PaginatedResponse[PagoListItemDTO],
    dependencies=[Depends(GestorPermisos(ROL_ADMIN_O_TESORERO))],
)
def listar_pagos(
    estado_pago: Optional[EstadoPago] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(obtener_sesion),
):
    items, total = PagoServicio(db).listar_pagos(estado_pago=estado_pago, skip=skip, limit=limit)
    return PaginatedResponse(items=items, total=total, skip=skip, limit=limit)


# --- Membresia ---
@router.get(
    "/estadisticas",
    response_model=MembresiaEstadisticasResponseDTO,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
def obtener_estadisticas_membresias(db: Session = Depends(obtener_sesion)):
    return {"active_memberships": MembresiaServicio(db).contar_membresias_activas()}


# Membresía expone relación persona<->plan: exige autenticación (no rol admin).
@router.get(
    "/{membresia_id}",
    response_model=MembresiaResponseDTO,
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def obtener_membresia(membresia_id: int, db: Session = Depends(obtener_sesion)):
    return MembresiaServicio(db).obtener_membresia(membresia_id)
# Registra un pago pendiente. A diferencia de antes, ya NO basta con estar
# autenticado con cualquier rol: se exige ser el dueño (persona_id del token
# == persona_id del payload) o ADMINISTRADOR, igual que en /voucher. Antes
# cualquier usuario logueado podía registrar un pago a nombre de otra persona.
@router.post(
    "/pagos",
    response_model=PagoResponseDTO,
    status_code=201,
)
async def registrar_pago(
    datos: PagoCreateDTO,
    db: Session = Depends(obtener_sesion),
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
):
    return PagoServicio(db).registrar_pago(
        datos,
        persona_id_solicitante=token_payload.get("persona_id"),
        roles_solicitante=token_payload.get("roles", []),
    )


@router.patch("/pagos/{pago_id}/validar", response_model=PagoResponseDTO,
              dependencies=[Depends(GestorPermisos(ROL_ADMIN_O_TESORERO))])
async def validar_pago(pago_id: int, datos: PagoValidarDTO, db: Session = Depends(obtener_sesion)):
    return PagoServicio(db).validar_pago(pago_id, datos)


@router.get(
    "/pagos/{pago_id}",
    response_model=PagoResponseDTO,
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def obtener_pago(pago_id: int, db: Session = Depends(obtener_sesion)):
    return PagoServicio(db).obtener_pago(pago_id)


# Historial de pagos de una persona (cualquier estado). Autenticado, NO
# restringido a admin: la autorización real (dueño, su representante, o
# ADMINISTRADOR) se valida dentro del servicio, igual que en POST /pagos.
# Tres segmentos ("pagos", "persona", "{persona_id}") -- no colisiona con
# GET /pagos/{pago_id} (dos segmentos) ni con `/{membresia_id}` (uno solo);
# ver la nota de orden de rutas más arriba en este archivo.
@router.get(
    "/pagos/persona/{persona_id}",
    response_model=List[PagoResponseDTO],
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def listar_pagos_de_persona(
    persona_id: int,
    db: Session = Depends(obtener_sesion),
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
):
    return PagoServicio(db).listar_pagos_de_persona(
        persona_id_objetivo=persona_id,
        persona_id_solicitante=token_payload.get("persona_id"),
        roles_solicitante=token_payload.get("roles", []),
    )


# --- ComprobantePago (PDF oficial generado por Celery al aprobar) ---
# Sólo admin puede adjuntar manualmente el comprobante oficial (la vida normal
# es que la tarea Celery lo genere): igualamos a `validar_pago` que ya es admin.
@router.post(
    "/pagos/{pago_id}/comprobante",
    response_model=ComprobantePagoResponseDTO, status_code=201,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def adjuntar_comprobante(pago_id: int, datos: ComprobantePagoCreateDTO, db: Session = Depends(obtener_sesion)):
    return PagoServicio(db).adjuntar_comprobante(pago_id, datos)


# --- Voucher de transferencia (cliente) ---
# Endpoint autenticado (delegado a la regla de negocio en PagoServicio para
# validar dueño/admin): a diferencia del ComprobantePago oficial, este
# adjunta la imagen/PDF que el cliente sube como evidencia de transferencia.
@router.post("/pagos/{pago_id}/voucher", response_model=PagoResponseDTO, status_code=201)
async def subir_voucher(
    pago_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(obtener_sesion),
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
):
    contenido = await archivo.read()
    return PagoServicio(db).adjuntar_voucher(
        pago_id=pago_id,
        persona_id_solicitante=token_payload.get("persona_id"),
        roles_solicitante=token_payload.get("roles", []),
        contenido=contenido,
        content_type=archivo.content_type,
        nombre_archivo=archivo.filename,
    )
