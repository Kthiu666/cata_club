from typing import Optional
from decimal import Decimal
from sqlalchemy.orm import Session

from app.dominio.modelos import EventoRecaudacion, MovimientoEvento, Egreso
from app.dominio.enums import TipoMovimientoEvento


class EventoRecaudacionRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_id(self, evento_id: int) -> Optional[EventoRecaudacion]:
        return self.db.get(EventoRecaudacion, evento_id)

    def listar(self) -> list[EventoRecaudacion]:
        return self.db.query(EventoRecaudacion).order_by(EventoRecaudacion.fecha_inicio.desc()).all()

    def crear(self, evento: EventoRecaudacion) -> EventoRecaudacion:
        self.db.add(evento)
        self.db.commit()
        self.db.refresh(evento)
        return evento


class MovimientoEventoRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def crear(self, movimiento: MovimientoEvento) -> MovimientoEvento:
        self.db.add(movimiento)
        self.db.commit()
        self.db.refresh(movimiento)
        return movimiento

    def listar_por_evento(self, evento_id: int) -> list[MovimientoEvento]:
        return (
            self.db.query(MovimientoEvento)
            .filter(MovimientoEvento.evento_id == evento_id)
            .order_by(MovimientoEvento.fecha.desc())
            .all()
        )

    def sumar_por_tipo(self, evento_id: int, tipo: TipoMovimientoEvento) -> Decimal:
        movimientos = [
            m for m in self.listar_por_evento(evento_id) if m.tipo == tipo
        ]
        return sum((m.monto for m in movimientos), Decimal("0.00"))

    def sumar_todos_por_tipo(self, tipo: TipoMovimientoEvento) -> Decimal:
        """Para el balance general del club (todos los eventos juntos)."""
        movimientos = self.db.query(MovimientoEvento).filter(MovimientoEvento.tipo == tipo).all()
        return sum((m.monto for m in movimientos), Decimal("0.00"))


class EgresoRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def crear(self, egreso: Egreso) -> Egreso:
        self.db.add(egreso)
        self.db.commit()
        self.db.refresh(egreso)
        return egreso

    def listar(self) -> list[Egreso]:
        return self.db.query(Egreso).order_by(Egreso.fecha.desc()).all()

    def sumar_todos(self) -> Decimal:
        return sum((e.monto for e in self.listar()), Decimal("0.00"))
