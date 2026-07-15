from typing import Optional, List
from sqlalchemy.orm import Session

from app.dominio.modelos import Persona


class PersonaRepositorio:
    """Encapsula todo el acceso a datos de Persona. Es la ÚNICA clase
    del proyecto que debe importar Session y ejecutar db.query/add/commit
    para esta entidad."""

    def __init__(self, db: Session):
        self.db = db

    def obtener_por_id(self, persona_id: int) -> Optional[Persona]:
        return self.db.get(Persona, persona_id)

    def obtener_por_cedula(self, cedula: str) -> Optional[Persona]:
        return self.db.query(Persona).filter(Persona.cedula == cedula).first()

    def listar(self, skip: int = 0, limit: int = 50) -> List[Persona]:
        return self.db.query(Persona).offset(skip).limit(limit).all()

    def crear(self, persona: Persona) -> Persona:
        self.db.add(persona)
        self.db.commit()
        self.db.refresh(persona)
        return persona

    def actualizar(self, persona: Persona, cambios: dict) -> Persona:
        for campo, valor in cambios.items():
            setattr(persona, campo, valor)
        self.db.commit()
        self.db.refresh(persona)
        return persona

    def eliminar(self, persona: Persona) -> None:
        self.db.delete(persona)
        self.db.commit()

    # --- Reportes (E01-RF010 / E04-RF014) -------------------------------------
    def listar_por_etiquetas(
        self, prioridad_municipal: Optional[bool] = None, becado: Optional[bool] = None
    ) -> List[Persona]:
        """E01-RF010: filtrar por las etiquetas informativas del perfil."""
        query = self.db.query(Persona)
        if prioridad_municipal is not None:
            query = query.filter(Persona.prioridad_municipal == prioridad_municipal)
        if becado is True:
            query = query.filter(Persona.porcentaje_beca > 0)
        elif becado is False:
            query = query.filter(Persona.porcentaje_beca == 0)
        return query.all()

    def listar_nuevas_por_periodo(self, fecha_inicio, fecha_fin) -> List[Persona]:
        """E04-RF014: alumnos nuevos registrados en un rango de fechas."""
        return (
            self.db.query(Persona)
            .filter(Persona.fecha_registro >= fecha_inicio, Persona.fecha_registro <= fecha_fin)
            .order_by(Persona.fecha_registro.asc())
            .all()
        )
