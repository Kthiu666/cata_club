from fastapi import HTTPException

from app.dominio.modelos import Persona
from app.infraestructura.repositorios.persona_repositorio import PersonaRepositorio
from app.presentacion.schemas.persona_schemas import PersonaCreateDTO, PersonaUpdateDTO


class PersonaService:
    """Reglas de negocio de Persona. No conoce SQLAlchemy ni la Session directamente."""

    def __init__(self, repositorio: PersonaRepositorio):
        self.repositorio = repositorio

    def registrar_persona(self, datos: PersonaCreateDTO) -> Persona:
        if self.repositorio.obtener_por_cedula(datos.cedula):
            raise HTTPException(status_code=400, detail="Ya existe una persona con esa cédula")

        if datos.representante_id:
            representante = self.repositorio.obtener_por_id(datos.representante_id)
            if not representante:
                raise HTTPException(status_code=404, detail="Representante no encontrado")

        nueva_persona = Persona(**datos.model_dump())
        return self.repositorio.guardar(nueva_persona)

    def listar_personas(self, skip: int = 0, limit: int = 50) -> list[Persona]:
        return self.repositorio.listar(skip, limit)

    def obtener_persona(self, persona_id: int) -> Persona:
        persona = self.repositorio.obtener_por_id(persona_id)
        if not persona:
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        return persona

    def listar_representados(self, persona_id: int) -> list[Persona]:
        persona = self.obtener_persona(persona_id)
        return persona.representados

    def actualizar_persona(self, persona_id: int, cambios: PersonaUpdateDTO) -> Persona:
        persona = self.obtener_persona(persona_id)
        datos_cambios = cambios.model_dump(exclude_unset=True)
        return self.repositorio.actualizar(persona, datos_cambios)

    def eliminar_persona(self, persona_id: int) -> None:
        persona = self.obtener_persona(persona_id)
        self.repositorio.eliminar(persona)