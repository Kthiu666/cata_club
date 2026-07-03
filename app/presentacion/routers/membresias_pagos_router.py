from fastapi import APIRouter, Depends
from typing import List

from app.presentacion.dependencias import obtener_membresia_service
from app.presentacion.schemas.membresia_pago_schemas import (
    MembresiaCreateDTO, MembresiaResponseDTO,
    PagoCreateDTO, PagoResponseDTO, PagoValidarDTO,
    ComprobantePagoCreateDTO, ComprobantePagoResponseDTO,
    TipoMembresiaCreateDTO, TipoMembresiaResponseDTO,
)
from app.servicios_negocio.gestor_permisos import GestorPermisos
from app.servicios_negocio.membresia_service import MembresiaService

router = APIRouter(prefix="/membresias", tags=["Membresías y Pagos"])


# --- TipoMembresia ---
@router.post("/tipos", response_model=TipoMembresiaResponseDTO, status_code=201,
             dependencies=[Depends(GestorPermisos(["ADMINISTRADOR"]))])
async def crear_tipo_membresia(
    datos: TipoMembresiaCreateDTO,
    service: MembresiaService = Depends(obtener_membresia_service),
):
    return service.crear_tipo_membresia(datos)


@router.get("/tipos", response_model=List[TipoMembresiaResponseDTO])
async def listar_tipos_membresia(service: MembresiaService = Depends(obtener_membresia_service)):
    return service.listar_tipos_membresia()


# --- Membresia ---
@router.post("/", response_model=MembresiaResponseDTO, status_code=201,
             dependencies=[Depends(GestorPermisos(["ADMINISTRADOR"]))])
async def crear_membresia(
    datos: MembresiaCreateDTO,
    service: MembresiaService = Depends(obtener_membresia_service),
):
    return service.crear_membresia(datos)


@router.get("/{membresia_id}", response_model=MembresiaResponseDTO)
async def obtener_membresia(
    membresia_id: int,
    service: MembresiaService = Depends(obtener_membresia_service),
):
    return service.obtener_membresia(membresia_id)


# --- Pago ---
@router.post("/pagos", response_model=PagoResponseDTO, status_code=201)
async def registrar_pago(
    datos: PagoCreateDTO,
    service: MembresiaService = Depends(obtener_membresia_service),
):
    return service.registrar_pago(datos)


@router.patch("/pagos/{pago_id}/validar", response_model=PagoResponseDTO,
              dependencies=[Depends(GestorPermisos(["ADMINISTRADOR"]))])
async def validar_pago(
    pago_id: int, datos: PagoValidarDTO,
    service: MembresiaService = Depends(obtener_membresia_service),
):
    return service.validar_pago(pago_id, datos)


@router.get("/pagos/{pago_id}", response_model=PagoResponseDTO)
async def obtener_pago(
    pago_id: int,
    service: MembresiaService = Depends(obtener_membresia_service),
):
    return service.obtener_pago(pago_id)


# --- ComprobantePago ---
@router.post("/pagos/{pago_id}/comprobante", response_model=ComprobantePagoResponseDTO, status_code=201)
async def adjuntar_comprobante(
    pago_id: int, datos: ComprobantePagoCreateDTO,
    service: MembresiaService = Depends(obtener_membresia_service),
):
    return service.adjuntar_comprobante(pago_id, datos)