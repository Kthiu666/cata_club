from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dominio.modelos import Pais, Provincia, Canton


class PaisRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_id(self, pais_id: int) -> Optional[Pais]:
        return self.db.get(Pais, pais_id)

    def listar(self) -> List[Pais]:
        return self.db.query(Pais).all()

    def crear(self, pais: Pais) -> Pais:
        self.db.add(pais)
        self.db.commit()
        self.db.refresh(pais)
        return pais


class ProvinciaRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_id(self, provincia_id: int) -> Optional[Provincia]:
        return self.db.get(Provincia, provincia_id)

    def listar(self, pais_id: Optional[int] = None) -> List[Provincia]:
        stmt = select(Provincia)
        if pais_id is not None:
            stmt = stmt.where(Provincia.pais_id == pais_id)
        return list(self.db.scalars(stmt).all())

    def crear(self, provincia: Provincia) -> Provincia:
        self.db.add(provincia)
        self.db.commit()
        self.db.refresh(provincia)
        return provincia


class CantonRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_id(self, canton_id: int) -> Optional[Canton]:
        return self.db.get(Canton, canton_id)

    def listar(self, provincia_id: Optional[int] = None) -> List[Canton]:
        stmt = select(Canton)
        if provincia_id is not None:
            stmt = stmt.where(Canton.provincia_id == provincia_id)
        return list(self.db.scalars(stmt).all())

    def crear(self, canton: Canton) -> Canton:
        self.db.add(canton)
        self.db.commit()
        self.db.refresh(canton)
        return canton
