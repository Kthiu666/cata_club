from sqlalchemy.orm import Session

from app.dominio.modelos import SolicitudClaseExtra
from app.dominio.enums import TipoModalidad, EstadoSolicitudExtra
from app.dominio.excepciones import EntidadNoEncontrada, OperacionInvalida
from app.infraestructura.repositorios.persona_repositorio import PersonaRepositorio
from app.infraestructura.repositorios.membresia_repositorio import MembresiaRepositorio
from app.infraestructura.repositorios.asistencia_repositorio import HorarioRepositorio
from app.infraestructura.repositorios.clase_extra_repositorio import SolicitudClaseExtraRepositorio
from app.presentacion.schemas.clase_extra_schemas import (
    SolicitudClaseExtraCreateDTO, SolicitudClaseExtraResolverDTO,
    SolicitudClaseExtraListItemDTO,
)


class ClaseExtraServicio:
    """
    Regla de negocio central: solo las membresías con TipoMembresia.modalidad
    == PERSONALIZADA pueden solicitar clases adicionales. Una membresía MENSUAL
    ya incluye acceso a todo el horario mensual, por lo que "clase extra" no
    aplica a ese tipo de plan.
    """

    def __init__(self, db: Session):
        self.repo = SolicitudClaseExtraRepositorio(db)
        self.repo_persona = PersonaRepositorio(db)
        self.repo_membresia = MembresiaRepositorio(db)
        self.repo_horario = HorarioRepositorio(db)

    def solicitar_clase_extra(self, datos: SolicitudClaseExtraCreateDTO) -> SolicitudClaseExtra:
        if not self.repo_persona.obtener_por_id(datos.persona_id):
            raise EntidadNoEncontrada(f"Persona con id {datos.persona_id} no encontrada")

        membresia = self.repo_membresia.obtener_por_id(datos.membresia_id)
        if not membresia:
            raise EntidadNoEncontrada(f"Membresía con id {datos.membresia_id} no encontrada")

        if membresia.persona_id != datos.persona_id:
            raise OperacionInvalida("La membresía indicada no pertenece a esta persona")

        if membresia.tipo_membresia.modalidad != TipoModalidad.PERSONALIZADA:
            raise OperacionInvalida(
                "Solo las membresías de modalidad PERSONALIZADA pueden solicitar clases extra"
            )

        if not self.repo_horario.obtener_por_id(datos.horario_id):
            raise EntidadNoEncontrada(f"Horario con id {datos.horario_id} no encontrado")

        solicitud = SolicitudClaseExtra(
            **datos.model_dump(), estado=EstadoSolicitudExtra.PENDIENTE
        )
        return self.repo.crear(solicitud)

    def resolver_solicitud(self, solicitud_id: int, datos: SolicitudClaseExtraResolverDTO) -> SolicitudClaseExtra:
        solicitud = self.repo.obtener_por_id(solicitud_id)
        if not solicitud:
            raise EntidadNoEncontrada(f"Solicitud con id {solicitud_id} no encontrada")

        if datos.estado == EstadoSolicitudExtra.APROBADA and datos.costo_adicional is None:
            raise OperacionInvalida("Debe indicar el costo adicional al aprobar una clase extra")

        solicitud.estado = datos.estado
        solicitud.costo_adicional = datos.costo_adicional
        if datos.observaciones:
            solicitud.observaciones = datos.observaciones

        return self.repo.guardar_cambios(solicitud)

    def listar_por_persona(self, persona_id: int) -> list[SolicitudClaseExtra]:
        if not self.repo_persona.obtener_por_id(persona_id):
            raise EntidadNoEncontrada(f"Persona con id {persona_id} no encontrada")
        return self.repo.listar_por_persona(persona_id)

    def listar_pendientes(self) -> list[SolicitudClaseExtraListItemDTO]:
        """Listado administrativo de solicitudes pendientes con datos
        enriquecidos del solicitante y del horario."""
        solicitudes = self.repo.listar_pendientes()
        return [
            SolicitudClaseExtraListItemDTO(
                id=s.id,
                fecha_clase_solicitada=s.fecha_clase_solicitada,
                estado=s.estado,
                costo_adicional=s.costo_adicional,
                fecha_solicitud=s.fecha_solicitud,
                observaciones=s.observaciones,
                persona_id=s.persona_id,
                persona_nombre_completo=f"{s.persona.nombres} {s.persona.apellidos}",
                membresia_id=s.membresia_id,
                horario_id=s.horario_id,
                horario_dia_semana=s.horario.dia_semana.value,
                horario_hora_inicio=s.horario.hora_inicio.isoformat(),
                horario_hora_fin=s.horario.hora_fin.isoformat(),
            )
            for s in solicitudes
        ]
