from sqlalchemy.orm import Session

from app.dominio.modelos import FichaMedica, Enfermedades
from app.dominio.excepciones import EntidadNoEncontrada, EntidadDuplicada
from app.infraestructura.repositorios.persona_repositorio import PersonaRepositorio
from app.infraestructura.repositorios.usuario_ficha_repositorio import FichaMedicaRepositorio
from app.presentacion.schemas.persona_schemas import FichaMedicaCreateDTO, FichaMedicaUpdateDTO


class FichaMedicaServicio:
    def __init__(self, db: Session):
        self.repo = FichaMedicaRepositorio(db)
        self.repo_persona = PersonaRepositorio(db)

    def crear_ficha_medica(self, datos: FichaMedicaCreateDTO) -> FichaMedica:
        persona = self.repo_persona.obtener_por_id(datos.persona_id)
        if not persona:
            raise EntidadNoEncontrada(f"Persona con id {datos.persona_id} no encontrada")
        if persona.ficha_medica:
            raise EntidadDuplicada("La persona ya tiene una ficha médica registrada")

        ficha = FichaMedica(tipo_sangre=datos.tipo_sangre, persona_id=datos.persona_id)
        for nombre in datos.enfermedades:
            ficha.enfermedades.append(Enfermedades(nombre_enfermedad=nombre))
        return self.repo.crear(ficha)

    def obtener_por_persona(self, persona_id: int) -> FichaMedica:
        persona = self.repo_persona.obtener_por_id(persona_id)
        if not persona or not persona.ficha_medica:
            raise EntidadNoEncontrada("Ficha médica no encontrada")
        return persona.ficha_medica

    def actualizar_por_persona(self, persona_id: int, datos: FichaMedicaUpdateDTO) -> FichaMedica:
        """PATCH parcial: solo toca los campos que vienen en el payload.
        `enfermedades`, si viene, REEMPLAZA la lista completa (ver docstring
        del DTO) en vez de hacer append, para que el frontend controle el
        estado final explícitamente."""
        ficha = self.obtener_por_persona(persona_id)
        if datos.tipo_sangre is not None:
            ficha.tipo_sangre = datos.tipo_sangre
        if datos.enfermedades is not None:
            ficha.enfermedades = [Enfermedades(nombre_enfermedad=n) for n in datos.enfermedades]
        return self.repo.guardar_cambios(ficha)
