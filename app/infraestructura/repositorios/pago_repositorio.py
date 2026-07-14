from typing import Optional
from sqlalchemy.orm import Session

from app.dominio.modelos import Pago, ComprobantePago


class PagoRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_id(self, pago_id: int) -> Optional[Pago]:
        return self.db.get(Pago, pago_id)

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
