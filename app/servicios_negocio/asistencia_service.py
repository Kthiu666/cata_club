from fastapi import HTTPException

from app.dominio.modelos import Asistencia, HorarioEntrenamiento
from app.infraestructura.repositorios.asistencia_repositorio import AsistenciaRepositorio
from app.infraestructura.repositorios.persona_repositorio import PersonaRepositorio
from app.presentacion.schemas.asistencia_schemas import AsistenciaCreateDTO, HorarioCreateDTO


class AsistenciaService:
    def __init__(self, repositorio: AsistenciaRepositorio, persona_repositorio: PersonaRepositorio):
        self.repositorio = repositorio
        self.persona_repositorio = persona_repositorio

    def crear_horario(self, datos: HorarioCreateDTO) -> HorarioEntrenamiento:
        if datos.hora_inicio >= datos.hora_fin:
            raise HTTPException(status_code=400, detail="La hora de inicio debe ser anterior a la hora de fin")
        horario = HorarioEntrenamiento(**datos.model_dump())
        return self.repositorio.guardar_horario(horario)

    def listar_horarios(self) -> list[HorarioEntrenamiento]:
        return self.repositorio.listar_horarios()

    def registrar_asistencia(self, datos: AsistenciaCreateDTO) -> Asistencia:
        if not self.persona_repositorio.obtener_por_id(datos.persona_id):
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        if not self.repositorio.obtener_horario_por_id(datos.horario_id):
            raise HTTPException(status_code=404, detail="Horario no encontrado")
        asistencia = Asistencia(**datos.model_dump())
        return self.repositorio.guardar_asistencia(asistencia)

    def historial_asistencia_persona(self, persona_id: int) -> list[Asistencia]:
        persona = self.persona_repositorio.obtener_por_id(persona_id)
        if not persona:
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        return persona.asistencias