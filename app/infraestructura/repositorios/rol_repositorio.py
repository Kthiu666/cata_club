from typing import Optional
from sqlalchemy.orm import Session

from app.dominio.modelos import Rol
from app.dominio.enums import TipoRol


class RolRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_tipo(self, tipo_rol: TipoRol) -> Optional[Rol]:
        return self.db.query(Rol).filter(Rol.tipo_rol == tipo_rol).first()

    def obtener_o_crear(self, tipo_rol: TipoRol) -> Rol:
        """Los `Rol` son, en la práctica, un catálogo fijo (uno por
        `TipoRol`). No hay un endpoint de "crear rol" porque no tiene
        sentido de negocio -- se garantiza que exista la fila la primera vez
        que se necesita, en vez de depender de un seed manual de BD."""
        rol = self.obtener_por_tipo(tipo_rol)
        if rol:
            return rol
        rol = Rol(tipo_rol=tipo_rol, descripcion=tipo_rol.value.capitalize())
        self.db.add(rol)
        self.db.commit()
        self.db.refresh(rol)
        return rol
