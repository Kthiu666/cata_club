from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List

from app.infraestructura.db import obtener_sesion
from app.seguridad.gestor_auth import GestorAutenticacion
from app.servicios_negocio.gestor_permisos import GestorPermisos
from app.servicios_negocio.tesoreria_servicio import TesoreriaServicio
from app.presentacion.schemas.tesoreria_schemas import (
    EventoRecaudacionCreateDTO, EventoRecaudacionResponseDTO,
    MovimientoEventoCreateDTO, MovimientoEventoResponseDTO,
    BalanceEventoResponseDTO, EgresoCreateDTO, EgresoResponseDTO,
    BalanceGeneralResponseDTO,
)

router = APIRouter(prefix="/tesoreria", tags=["tesoreria"])

ROL_ADMIN = ["ADMINISTRADOR"]


# --- Eventos de recaudación (E04-RF010) --------------------------------------
@router.post(
    "/eventos", response_model=EventoRecaudacionResponseDTO, status_code=201,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def crear_evento(datos: EventoRecaudacionCreateDTO, db: Session = Depends(obtener_sesion)):
    return TesoreriaServicio(db).crear_evento(datos)


@router.get(
    "/eventos", response_model=List[EventoRecaudacionResponseDTO],
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def listar_eventos(db: Session = Depends(obtener_sesion)):
    return TesoreriaServicio(db).listar_eventos()


# --- Movimientos de un evento (E04-RF011) ------------------------------------
@router.post(
    "/eventos/{evento_id}/movimientos", response_model=MovimientoEventoResponseDTO, status_code=201,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def registrar_movimiento(
    evento_id: int,
    datos: MovimientoEventoCreateDTO,
    db: Session = Depends(obtener_sesion),
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
):
    return TesoreriaServicio(db).registrar_movimiento(
        evento_id, datos, registrado_por_id=token_payload.get("persona_id")
    )


@router.get(
    "/eventos/{evento_id}/movimientos", response_model=List[MovimientoEventoResponseDTO],
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def listar_movimientos(evento_id: int, db: Session = Depends(obtener_sesion)):
    return TesoreriaServicio(db).listar_movimientos(evento_id)


# --- Balance de un evento (E04-RF012) -----------------------------------------
@router.get(
    "/eventos/{evento_id}/balance", response_model=BalanceEventoResponseDTO,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def obtener_balance_evento(evento_id: int, db: Session = Depends(obtener_sesion)):
    return TesoreriaServicio(db).obtener_balance_evento(evento_id)


# --- Egresos generales del club (E04-RF009, actor: Administrador) ------------
@router.post(
    "/egresos", response_model=EgresoResponseDTO, status_code=201,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def crear_egreso(
    datos: EgresoCreateDTO,
    db: Session = Depends(obtener_sesion),
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
):
    return TesoreriaServicio(db).crear_egreso(datos, registrado_por_id=token_payload.get("persona_id"))


@router.get(
    "/egresos", response_model=List[EgresoResponseDTO],
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def listar_egresos(db: Session = Depends(obtener_sesion)):
    return TesoreriaServicio(db).listar_egresos()


# --- Balance general del club (E04-RF012) -------------------------------------
@router.get(
    "/balance-general", response_model=BalanceGeneralResponseDTO,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def obtener_balance_general(db: Session = Depends(obtener_sesion)):
    return TesoreriaServicio(db).obtener_balance_general()


# --- E04-RF013: reporte financiero en PDF -------------------------------------
@router.get(
    "/balance-general/pdf",
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def descargar_balance_general_pdf(db: Session = Depends(obtener_sesion)):
    from app.infraestructura.generador_pdf import generar_reporte_pdf
    from datetime import datetime

    balance = TesoreriaServicio(db).obtener_balance_general()
    pdf_bytes = generar_reporte_pdf(
        titulo="Balance General del Club",
        subtitulo=f"Emitido el {datetime.now().strftime('%d/%m/%Y')}",
        encabezados=["Concepto", "Monto (USD)"],
        filas=[
            ["Ingresos por membresías", f"{balance.total_ingresos_membresias:.2f}"],
            ["Ingresos por eventos de recaudación", f"{balance.total_ingresos_eventos:.2f}"],
            ["Egresos de eventos de recaudación", f"{balance.total_egresos_eventos:.2f}"],
            ["Egresos generales del club", f"{balance.total_egresos_generales:.2f}"],
            ["BALANCE NETO", f"{balance.balance_neto:.2f}"],
        ],
    )
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=balance-general.pdf"},
    )
