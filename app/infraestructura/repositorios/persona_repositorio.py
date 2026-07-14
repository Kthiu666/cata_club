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
