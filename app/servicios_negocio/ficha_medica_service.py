from fastapi import HTTPException

from app.dominio.modelos import FichaMedica, Enfermedades
from app.infraestructura.repositorios.ficha_medica_repositorio import FichaMedicaRepositorio
from app.infraestructura.repositorios.persona_repositorio import PersonaRepositorio
from app.presentacion.schemas.persona_schemas import FichaMedicaCreateDTO


class FichaMedicaService:
    def __init__(self, repositorio: FichaMedicaRepositorio, persona_repositorio: PersonaRepositorio):
        self.repositorio = repositorio
        self.persona_repositorio = persona_repositorio

    def crear_ficha_medica(self, datos: FichaMedicaCreateDTO) -> FichaMedica:
        persona = self.persona_repositorio.obtener_por_id(datos.persona_id)
        if not persona:
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        if persona.ficha_medica:
            raise HTTPException(status_code=400, detail="La persona ya tiene una ficha médica registrada")

        ficha = FichaMedica(tipo_sangre=datos.tipo_sangre, persona_id=datos.persona_id)
        # 0..* : las enfermedades son opcionales, no obligatorias
        for nombre in datos.enfermedades:
            ficha.enfermedades.append(Enfermedades(nombre_enfermedad=nombre))

        return self.repositorio.guardar(ficha)

    def obtener_ficha_por_persona(self, persona_id: int) -> FichaMedica:
        persona = self.persona_repositorio.obtener_por_id(persona_id)
        if not persona or not persona.ficha_medica:
            raise HTTPException(status_code=404, detail="Ficha médica no encontrada")
        return persona.ficha_medica