from typing import Optional, List
from sqlalchemy.orm import Session

from app.dominio.modelos import Asistencia, HorarioEntrenamiento


class HorarioRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_id(self, horario_id: int) -> Optional[HorarioEntrenamiento]:
        return self.db.get(HorarioEntrenamiento, horario_id)

    def listar(self) -> List[HorarioEntrenamiento]:
        return self.db.query(HorarioEntrenamiento).all()

    def crear(self, horario: HorarioEntrenamiento) -> HorarioEntrenamiento:
        self.db.add(horario)
        self.db.commit()
        self.db.refresh(horario)
        return horario


class AsistenciaRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def crear(self, asistencia: Asistencia) -> Asistencia:
        self.db.add(asistencia)
        self.db.commit()
        self.db.refresh(asistencia)
        return asistencia

    def listar_por_persona(self, persona_id: int) -> List[Asistencia]:
        return self.db.query(Asistencia).filter(Asistencia.persona_id == persona_id).all()

    def listar_reporte(
        self,
        horario_id: Optional[int] = None,
        persona_id: Optional[int] = None,
        fecha_inicio=None,
        fecha_fin=None,
    ) -> List[Asistencia]:
        """E02-RF005: reporte de asistencia por horario, periodo o alumno.
        Los tres filtros son opcionales y combinables."""
        query = self.db.query(Asistencia)
        if horario_id is not None:
            query = query.filter(Asistencia.horario_id == horario_id)
        if persona_id is not None:
            query = query.filter(Asistencia.persona_id == persona_id)
        if fecha_inicio is not None:
            query = query.filter(Asistencia.fecha_entrenamiento >= fecha_inicio)
        if fecha_fin is not None:
            query = query.filter(Asistencia.fecha_entrenamiento <= fecha_fin)
        return query.order_by(Asistencia.fecha_entrenamiento.desc()).all()


