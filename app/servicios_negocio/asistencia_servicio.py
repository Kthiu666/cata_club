from sqlalchemy.orm import Session

from app.dominio.modelos import Asistencia, HorarioEntrenamiento
from app.dominio.enums import TipoRol
from app.dominio.excepciones import EntidadNoEncontrada, OperacionInvalida
from app.infraestructura.repositorios.persona_repositorio import PersonaRepositorio
from app.infraestructura.repositorios.asistencia_repositorio import AsistenciaRepositorio, HorarioRepositorio
from app.presentacion.schemas.asistencia_schemas import AsistenciaCreateDTO, HorarioCreateDTO


class AsistenciaServicio:
    def __init__(self, db: Session):
        self.repo = AsistenciaRepositorio(db)
        self.repo_horario = HorarioRepositorio(db)
        self.repo_persona = PersonaRepositorio(db)

    def _validar_entrenador(self, persona_id: int) -> None:
        """Un entrenador (titular o sustituto) debe ser una Persona con un
        Usuario que tenga el rol ENTRENADOR. Evita asignar por error a
        cualquier persona (ej. un alumno) como responsable de una sesión."""
        persona = self.repo_persona.obtener_por_id(persona_id)
        if not persona:
            raise EntidadNoEncontrada(f"Entrenador con id {persona_id} no encontrado")
        tiene_rol_entrenador = bool(
            persona.usuario and any(rol.tipo_rol == TipoRol.ENTRENADOR for rol in persona.usuario.roles)
        )
        if not tiene_rol_entrenador:
            raise OperacionInvalida(
                f"La persona con id {persona_id} no tiene el rol ENTRENADOR asignado"
            )

    def crear_horario(self, datos: HorarioCreateDTO) -> HorarioEntrenamiento:
        if datos.hora_inicio >= datos.hora_fin:
            raise OperacionInvalida("La hora de inicio debe ser anterior a la hora de fin")
        self._validar_entrenador(datos.entrenador_id)
        return self.repo_horario.crear(HorarioEntrenamiento(**datos.model_dump()))

    def listar_horarios(self) -> list[HorarioEntrenamiento]:
        return self.repo_horario.listar()

    def registrar_asistencia(self, datos: AsistenciaCreateDTO) -> Asistencia:
        """entrenador_id se recibe explícito en cada registro (no se copia
        automáticamente del horario) para permitir sustituciones: por defecto
        el frontend puede pre-llenarlo con el titular del horario, pero el
        usuario que registra puede cambiarlo si ese día dictó otro entrenador."""
        if not self.repo_persona.obtener_por_id(datos.persona_id):
            raise EntidadNoEncontrada(f"Persona con id {datos.persona_id} no encontrada")
        if not self.repo_horario.obtener_por_id(datos.horario_id):
            raise EntidadNoEncontrada(f"Horario con id {datos.horario_id} no encontrado")
        self._validar_entrenador(datos.entrenador_id)
        return self.repo.crear(Asistencia(**datos.model_dump()))

    def historial_por_persona(self, persona_id: int) -> list[Asistencia]:
        if not self.repo_persona.obtener_por_id(persona_id):
            raise EntidadNoEncontrada(f"Persona con id {persona_id} no encontrada")
        return self.repo.listar_por_persona(persona_id)

    def generar_reporte(
        self, horario_id=None, persona_id=None, fecha_inicio=None, fecha_fin=None
    ) -> list[Asistencia]:
        """E02-RF005: reporte de asistencia por horario, periodo o alumno.
        No existía ningún endpoint de reporte -- solo el historial fijo por
        persona de arriba. Los tres filtros son opcionales y combinables."""
        return self.repo.listar_reporte(
            horario_id=horario_id, persona_id=persona_id,
            fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
        )
