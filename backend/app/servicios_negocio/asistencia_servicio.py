from sqlalchemy.orm import Session

from app.dominio.modelos import Asistencia, HorarioEntrenamiento, AlumnoHorario
from app.dominio.enums import TipoRol
from app.dominio.excepciones import EntidadNoEncontrada, OperacionInvalida
from app.infraestructura.repositorios.persona_repositorio import PersonaRepositorio
from app.infraestructura.repositorios.asistencia_repositorio import (
    AsistenciaRepositorio, HorarioRepositorio, AlumnoHorarioRepositorio
)
from app.presentacion.schemas.asistencia_schemas import (
    AsistenciaCreateDTO, HorarioCreateDTO, HorarioUpdateDTO,
    AlumnoHorarioCreateDTO, AlumnoHorarioDetalleDTO
)


class AsistenciaServicio:
    def __init__(self, db: Session):
        self.repo = AsistenciaRepositorio(db)
        self.repo_horario = HorarioRepositorio(db)
        self.repo_persona = PersonaRepositorio(db)
        self.repo_alumno_horario = AlumnoHorarioRepositorio(db)

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

    def actualizar_horario(self, horario_id: int, datos: HorarioUpdateDTO) -> HorarioEntrenamiento:
        horario = self.repo_horario.obtener_por_id(horario_id)
        if not horario:
            raise EntidadNoEncontrada(f"Horario con id {horario_id} no encontrado")
        update_data = datos.model_dump(exclude_unset=True)
        if not update_data:
            raise OperacionInvalida("No se proporcionaron campos para actualizar")
        if "entrenador_id" in update_data:
            self._validar_entrenador(update_data["entrenador_id"])
        for key, value in update_data.items():
            setattr(horario, key, value)
        if horario.hora_inicio >= horario.hora_fin:
            raise OperacionInvalida("La hora de inicio debe ser anterior a la hora de fin")
        return self.repo_horario.actualizar(horario)

    def eliminar_horario(self, horario_id: int) -> None:
        horario = self.repo_horario.obtener_por_id(horario_id)
        if not horario:
            raise EntidadNoEncontrada(f"Horario con id {horario_id} no encontrado")
        self.repo_horario.eliminar(horario)

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

    # --- Asignación directa Alumno ↔ Horario ---------------------------------
    def asignar_alumno_a_horario(self, datos: AlumnoHorarioCreateDTO) -> AlumnoHorario:
        """Asigna un alumno a un horario específico de forma directa."""
        if not self.repo_persona.obtener_por_id(datos.persona_id):
            raise EntidadNoEncontrada(f"Persona con id {datos.persona_id} no encontrada")
        if not self.repo_horario.obtener_por_id(datos.horario_id):
            raise EntidadNoEncontrada(f"Horario con id {datos.horario_id} no encontrado")

        existente = self.repo_alumno_horario.obtener_por_persona_y_horario(
            datos.persona_id, datos.horario_id
        )
        if existente:
            raise OperacionInvalida(
                f"El alumno {datos.persona_id} ya está asignado al horario {datos.horario_id}"
            )

        alumno_horario = AlumnoHorario(
            persona_id=datos.persona_id,
            horario_id=datos.horario_id,
        )
        return self.repo_alumno_horario.crear(alumno_horario)

    def desasignar_alumno_de_horario(
        self, persona_id: int, horario_id: int
    ) -> None:
        """Elimina la asignación directa de un alumno a un horario."""
        asignacion = self.repo_alumno_horario.obtener_por_persona_y_horario(
            persona_id, horario_id
        )
        if not asignacion:
            raise EntidadNoEncontrada(
                f"No existe asignación del alumno {persona_id} al horario {horario_id}"
            )
        self.repo_alumno_horario.eliminar(asignacion)

    def listar_alumnos_por_horario(self, horario_id: int) -> list[AlumnoHorarioDetalleDTO]:
        """Lista todos los alumnos asignados a un horario específico."""
        if not self.repo_horario.obtener_por_id(horario_id):
            raise EntidadNoEncontrada(f"Horario con id {horario_id} no encontrado")

        asignaciones = self.repo_alumno_horario.listar_por_horario(horario_id)
        return [
            AlumnoHorarioDetalleDTO(
                id=a.id,
                persona_id=a.persona_id,
                persona_nombre_completo=f"{a.persona.nombres} {a.persona.apellidos}",
                horario_id=a.horario_id,
                horario_dia=a.horario.dia_semana,
                horario_hora_inicio=a.horario.hora_inicio,
                horario_hora_fin=a.horario.hora_fin,
                fecha_asignacion=a.fecha_asignacion,
            )
            for a in asignaciones
        ]

    def listar_horarios_por_alumno(self, persona_id: int) -> list[AlumnoHorarioDetalleDTO]:
        """Lista todos los horarios asignados a un alumno específico."""
        if not self.repo_persona.obtener_por_id(persona_id):
            raise EntidadNoEncontrada(f"Persona con id {persona_id} no encontrada")

        asignaciones = self.repo_alumno_horario.listar_por_persona(persona_id)
        return [
            AlumnoHorarioDetalleDTO(
                id=a.id,
                persona_id=a.persona_id,
                persona_nombre_completo=f"{a.persona.nombres} {a.persona.apellidos}",
                horario_id=a.horario_id,
                horario_dia=a.horario.dia_semana,
                horario_hora_inicio=a.horario.hora_inicio,
                horario_hora_fin=a.horario.hora_fin,
                fecha_asignacion=a.fecha_asignacion,
            )
            for a in asignaciones
        ]
