from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.dominio.modelos import EventoRecaudacion, MovimientoEvento, Egreso, Pago
from app.dominio.enums import TipoMovimientoEvento, EstadoPago
from app.dominio.excepciones import EntidadNoEncontrada
from app.infraestructura.repositorios.tesoreria_repositorio import (
    EventoRecaudacionRepositorio, MovimientoEventoRepositorio, EgresoRepositorio,
)
from app.presentacion.schemas.tesoreria_schemas import (
    EventoRecaudacionCreateDTO, MovimientoEventoCreateDTO, EgresoCreateDTO,
    BalanceEventoResponseDTO, BalanceGeneralResponseDTO,
)


class TesoreriaServicio:
    """
    Épica E04 RF009-RF012: gestión de eventos de recaudación y egresos del club.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo_evento = EventoRecaudacionRepositorio(db)
        self.repo_movimiento = MovimientoEventoRepositorio(db)
        self.repo_egreso = EgresoRepositorio(db)

    # --- Eventos (RF010) -----------------------------------------------------
    def crear_evento(self, datos: EventoRecaudacionCreateDTO) -> EventoRecaudacion:
        evento = EventoRecaudacion(**datos.model_dump())
        return self.repo_evento.crear(evento)

    def listar_eventos(self) -> list[EventoRecaudacion]:
        return self.repo_evento.listar()

    def obtener_evento(self, evento_id: int) -> EventoRecaudacion:
        evento = self.repo_evento.obtener_por_id(evento_id)
        if not evento:
            raise EntidadNoEncontrada(f"Evento de recaudación con id {evento_id} no encontrado")
        return evento

    # --- Movimientos (RF011) --------------------------------------------------
    def registrar_movimiento(
        self, evento_id: int, datos: MovimientoEventoCreateDTO, registrado_por_id: int
    ) -> MovimientoEvento:
        self.obtener_evento(evento_id)  # 404 si no existe
        movimiento = MovimientoEvento(
            **datos.model_dump(), evento_id=evento_id, registrado_por_id=registrado_por_id
        )
        return self.repo_movimiento.crear(movimiento)

    def listar_movimientos(self, evento_id: int) -> list[MovimientoEvento]:
        self.obtener_evento(evento_id)
        return self.repo_movimiento.listar_por_evento(evento_id)

    # --- Balance de un evento (RF012) -----------------------------------------
    def obtener_balance_evento(self, evento_id: int) -> BalanceEventoResponseDTO:
        evento = self.obtener_evento(evento_id)
        ingresos = self.repo_movimiento.sumar_por_tipo(evento_id, TipoMovimientoEvento.INGRESO)
        egresos = self.repo_movimiento.sumar_por_tipo(evento_id, TipoMovimientoEvento.EGRESO)
        return BalanceEventoResponseDTO(
            evento_id=evento_id, nombre=evento.nombre,
            total_ingresos=ingresos, total_egresos=egresos,
            balance=ingresos - egresos, meta_monto=evento.meta_monto,
        )

    # --- Egresos generales del club (RF009) -----------------------------------
    def crear_egreso(self, datos: EgresoCreateDTO, registrado_por_id: int) -> Egreso:
        egreso = Egreso(**datos.model_dump(), registrado_por_id=registrado_por_id)
        return self.repo_egreso.crear(egreso)

    def listar_egresos(self) -> list[Egreso]:
        return self.repo_egreso.listar()

    # --- Balance general del club (RF012) -------------------------------------
    def obtener_balance_general(self) -> BalanceGeneralResponseDTO:
        """
        Ingresos del club = pagos de membresía APROBADOS + ingresos de todos
        los eventos de recaudación. Egresos = egresos generales (RF009) +
        egresos de eventos. Es la interpretación más directa de "balance
        general del club" dado lo que el sistema modela; no hay una regla
        explícita en el documento sobre qué debe incluir exactamente, así
        que queda documentada aquí para que sea auditable/ajustable.
        """
        total_pagos = self.db.execute(
            select(func.coalesce(func.sum(Pago.monto), 0)).where(
                Pago.estado_pago == EstadoPago.APROBADO
            )
        ).scalar_one()
        total_ingresos_eventos = self.repo_movimiento.sumar_todos_por_tipo(TipoMovimientoEvento.INGRESO)
        total_egresos_eventos = self.repo_movimiento.sumar_todos_por_tipo(TipoMovimientoEvento.EGRESO)
        total_egresos_generales = self.repo_egreso.sumar_todos()

        total_ingresos_membresias = Decimal(total_pagos)
        balance_neto = (
            total_ingresos_membresias + total_ingresos_eventos
            - total_egresos_eventos - total_egresos_generales
        )
        return BalanceGeneralResponseDTO(
            total_ingresos_membresias=total_ingresos_membresias,
            total_ingresos_eventos=total_ingresos_eventos,
            total_egresos_eventos=total_egresos_eventos,
            total_egresos_generales=total_egresos_generales,
            balance_neto=balance_neto,
        )
