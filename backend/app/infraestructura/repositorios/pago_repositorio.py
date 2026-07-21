from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.dominio.modelos import Pago, ComprobantePago
from app.dominio.enums import EstadoPago


class PagoRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_id(self, pago_id: int) -> Optional[Pago]:
        return self.db.get(Pago, pago_id)

    def listar(
        self,
        estado_pago: Optional[EstadoPago] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Pago]:
        """Lista pagos para la cola de validación del Administrador.
        `joinedload(Pago.persona)` evita el problema N+1: el servicio necesita
        el nombre de cada persona para armar PagoListItemDTO y sin esto
        dispararía una query aparte por cada fila."""
        stmt = select(Pago).options(joinedload(Pago.persona))
        if estado_pago is not None:
            stmt = stmt.where(Pago.estado_pago == estado_pago)
        stmt = stmt.order_by(Pago.fecha_registro.desc()).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def listar_por_persona(self, persona_id: int) -> list[Pago]:
        """Historial completo (cualquier estado) de los pagos de una persona.
        Sin `joinedload(Pago.persona)`: a diferencia de `listar()`, aquí la
        persona ya es conocida por quien solicita (dueño/representante/admin),
        así que no hay N+1 que evitar -- el response DTO tampoco expone
        `persona_nombre_completo`."""
        stmt = (
            select(Pago)
            .where(Pago.persona_id == persona_id)
            .order_by(Pago.fecha_registro.desc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def contar(self, estado_pago: Optional[EstadoPago] = None) -> int:
        """Cuenta el total de pagos (opcionalmente filtrados por estado)."""
        from sqlalchemy import func
        stmt = select(func.count()).select_from(Pago)
        if estado_pago is not None:
            stmt = stmt.where(Pago.estado_pago == estado_pago)
        return self.db.execute(stmt).scalar_one()

    def crear(self, pago: Pago) -> Pago:
        self.db.add(pago)
        self.db.commit()
        self.db.refresh(pago)
        return pago

    def guardar_cambios(self, pago: Pago) -> Pago:
        self.db.commit()
        self.db.refresh(pago)
        return pago


class ComprobantePagoRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def crear(self, comprobante: ComprobantePago) -> ComprobantePago:
        self.db.add(comprobante)
        self.db.commit()
        self.db.refresh(comprobante)
        return comprobante
