from typing import Optional
from sqlalchemy.orm import Session

from app.dominio.modelos import FichaMedica, Usuario


class FichaMedicaRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def crear(self, ficha: FichaMedica) -> FichaMedica:
        self.db.add(ficha)
        self.db.commit()
        self.db.refresh(ficha)
        return ficha

    def guardar_cambios(self, ficha: FichaMedica) -> FichaMedica:
        self.db.add(ficha)
        self.db.commit()
        self.db.refresh(ficha)
        return ficha


class UsuarioRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_correo(self, correo: str) -> Optional[Usuario]:
        return self.db.query(Usuario).filter(Usuario.correo == correo).first()

    def obtener_por_persona_id(self, persona_id: int) -> Optional[Usuario]:
        return self.db.query(Usuario).filter(Usuario.persona_id == persona_id).first()

    def crear(self, usuario: Usuario) -> Usuario:
        self.db.add(usuario)
        self.db.commit()
        self.db.refresh(usuario)
        return usuario
