from typing import Optional, List
from sqlalchemy.orm import Session, joinedload

from app.dominio.enums import EstadoSolicitudExtra
from app.dominio.modelos import SolicitudClaseExtra


class SolicitudClaseExtraRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_id(self, solicitud_id: int) -> Optional[SolicitudClaseExtra]:
        return self.db.get(SolicitudClaseExtra, solicitud_id)

    def crear(self, solicitud: SolicitudClaseExtra) -> SolicitudClaseExtra:
        self.db.add(solicitud)
        self.db.commit()
        self.db.refresh(solicitud)
        return solicitud

    def guardar_cambios(self, solicitud: SolicitudClaseExtra) -> SolicitudClaseExtra:
        self.db.commit()
        self.db.refresh(solicitud)
        return solicitud

    def listar_por_persona(self, persona_id: int) -> List[SolicitudClaseExtra]:
        return (
            self.db.query(SolicitudClaseExtra)
            .filter(SolicitudClaseExtra.persona_id == persona_id)
            .all()
        )

    def listar_pendientes(self) -> List[SolicitudClaseExtra]:
        """Solicitudes en estado PENDIENTE con persona y horario precargados
        para evitar N+1 en el listado administrativo."""
        return (
            self.db.query(SolicitudClaseExtra)
            .filter(SolicitudClaseExtra.estado == EstadoSolicitudExtra.PENDIENTE)
            .options(joinedload(SolicitudClaseExtra.persona), joinedload(SolicitudClaseExtra.horario))
            .all()
        )
