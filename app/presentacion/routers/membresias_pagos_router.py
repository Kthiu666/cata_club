from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session
from typing import List

from app.infraestructura.db import obtener_sesion
from app.presentacion.schemas.membresia_pago_schemas import (
    MembresiaCreateDTO, MembresiaResponseDTO,
    PagoCreateDTO, PagoResponseDTO, PagoValidarDTO,
    ComprobantePagoCreateDTO, ComprobantePagoResponseDTO,
    TipoMembresiaCreateDTO, TipoMembresiaResponseDTO,
)
from app.seguridad.gestor_auth import GestorAutenticacion
from app.servicios_negocio.membresia_pago_servicio import MembresiaServicio, PagoServicio
from app.servicios_negocio.gestor_permisos import GestorPermisos

router = APIRouter(prefix="/membresias", tags=["Membresías y Pagos"])

# Reutilizado para endpoints admin (mismo string que usaba el código original).
ROL_ADMIN = ["ADMINISTRADOR"]


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


# Membresía expone relación persona<->plan: exige autenticación (no rol admin).
@router.get(
    "/{membresia_id}",
    response_model=MembresiaResponseDTO,
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def obtener_membresia(membresia_id: int, db: Session = Depends(obtener_sesion)):
    return MembresiaServicio(db).obtener_membresia(membresia_id)


# --- Pago ---
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
              dependencies=[Depends(GestorPermisos(ROL_ADMIN))])
async def validar_pago(pago_id: int, datos: PagoValidarDTO, db: Session = Depends(obtener_sesion)):
    return PagoServicio(db).validar_pago(pago_id, datos)


@router.get(
    "/pagos/{pago_id}",
    response_model=PagoResponseDTO,
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def obtener_pago(pago_id: int, db: Session = Depends(obtener_sesion)):
    return PagoServicio(db).obtener_pago(pago_id)


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
