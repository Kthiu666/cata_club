from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.infraestructura.db import obtener_sesion
from app.seguridad.gestor_auth import GestorAutenticacion
from app.servicios_negocio.gestor_permisos import GestorPermisos
from app.servicios_negocio.ranking_servicio import (
    NivelRankingServicio, RankingServicio, NotificacionServicio,
)
from app.presentacion.schemas.ranking_schemas import (
    NivelRankingCreateDTO, NivelRankingResponseDTO, NivelRankingConOcupacionDTO,
    AsignarNivelInicialDTO, RankingResponseDTO, TablaRankingItemDTO,
    ResultadoMensualRegistrarDTO, ResultadoMensualResponseDTO, CierreMensualResponseDTO,
    JustificativoCreateDTO, JustificativoEvaluarDTO, JustificativoResponseDTO,
    ReingresoResponseDTO, SeleccionOficialDTO, PerfilRankingAlumnoDTO,
    NotificacionResponseDTO, AsignacionRankingResponseDTO,
    ResultadoMensualRankingResponseDTO, CierreMensualRankingResponseDTO,
)

router = APIRouter(prefix="/ranking", tags=["ranking"])

ROL_ADMIN = ["ADMINISTRADOR"]
ROL_ENTRENADOR = ["ENTRENADOR"]
ROL_ADMIN_O_ENTRENADOR = ["ADMINISTRADOR", "ENTRENADOR"]


# --- Niveles de ranking (E03-RF001) -----------------------------------------
@router.post(
    "/niveles", response_model=NivelRankingResponseDTO, status_code=201,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def crear_nivel(datos: NivelRankingCreateDTO, db: Session = Depends(obtener_sesion)):
    return NivelRankingServicio(db).crear_nivel(datos)


@router.get(
    "/niveles", response_model=List[NivelRankingConOcupacionDTO],
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def listar_niveles(db: Session = Depends(obtener_sesion)):
    return NivelRankingServicio(db).listar_niveles_con_ocupacion()


@router.get(
    "/asignaciones", response_model=List[AsignacionRankingResponseDTO],
    dependencies=[Depends(GestorPermisos(ROL_ADMIN_O_ENTRENADOR))],
)
async def listar_asignaciones(db: Session = Depends(obtener_sesion)):
    """Listado de todos los alumnos en el ranking (con su nivel y posición)."""
    return RankingServicio(db).listar_asignaciones()


@router.get(
    "/resultados-mensuales", response_model=List[ResultadoMensualRankingResponseDTO],
    dependencies=[Depends(GestorPermisos(ROL_ADMIN_O_ENTRENADOR))],
)
async def listar_resultados_mensuales(
    nivel_id: int | None = Query(default=None),
    anio: int | None = Query(default=None),
    mes: int | None = Query(default=None, ge=1, le=12),
    db: Session = Depends(obtener_sesion),
):
    """Listado de resultados mensuales, filtrable por nivel, año y mes."""
    return RankingServicio(db).listar_resultados_mensuales(nivel_id, anio, mes)


@router.get(
    "/cierres-mensuales", response_model=List[CierreMensualRankingResponseDTO],
    dependencies=[Depends(GestorPermisos(ROL_ADMIN_O_ENTRENADOR))],
)
async def listar_cierres_mensuales(
    nivel_id: int | None = Query(default=None),
    db: Session = Depends(obtener_sesion),
):
    """Historial de cierres mensuales de ranking."""
    return RankingServicio(db).listar_cierres_mensuales(nivel_id)


@router.get(
    "/niveles/{nivel_id}/tabla", response_model=List[TablaRankingItemDTO],
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def obtener_tabla_de_nivel(nivel_id: int, db: Session = Depends(obtener_sesion)):
    """E03-RF010: tabla de posiciones de un nivel."""
    return RankingServicio(db).obtener_tabla_de_nivel(nivel_id)


# --- Asignación de nivel inicial (E03-RF002) --------------------------------
@router.post(
    "/asignar-nivel-inicial", response_model=RankingResponseDTO, status_code=201,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN_O_ENTRENADOR))],
)
async def asignar_nivel_inicial(datos: AsignarNivelInicialDTO, db: Session = Depends(obtener_sesion)):
    return RankingServicio(db).asignar_nivel_inicial(datos)


@router.patch(
    "/{persona_id}/mover-de-nivel", response_model=RankingResponseDTO,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN_O_ENTRENADOR))],
)
async def mover_de_nivel(persona_id: int, nuevo_nivel_id: int, db: Session = Depends(obtener_sesion)):
    """Aplica manualmente un ascenso/descenso (sugerido en el cierre mensual
    o decidido directamente). RF009 dice "sugerir", no mover automáticamente."""
    return RankingServicio(db).mover_de_nivel(persona_id, nuevo_nivel_id)


# --- Resultados mensuales (E03-RF003) ---------------------------------------
@router.post(
    "/resultados-mensuales", response_model=ResultadoMensualResponseDTO, status_code=201,
    dependencies=[Depends(GestorPermisos(ROL_ENTRENADOR))],
)
async def registrar_resultado_mensual(
    datos: ResultadoMensualRegistrarDTO, db: Session = Depends(obtener_sesion)
):
    return RankingServicio(db).registrar_resultado_mensual(datos)


# --- Cierre mensual (E03-RF004/RF005/RF007/RF009) ---------------------------
@router.post(
    "/niveles/{nivel_id}/cerrar-mes", response_model=CierreMensualResponseDTO,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN_O_ENTRENADOR))],
)
async def cerrar_mes(
    nivel_id: int, anio: int = Query(...), mes: int = Query(..., ge=1, le=12),
    db: Session = Depends(obtener_sesion),
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
):
    """Cierre MANUAL (decisión del equipo): calcula puntos, detecta
    ausencias no justificadas, elimina tras 2 meses consecutivos
    (notificando antes) y sugiere ascensos/descensos."""
    return RankingServicio(db).cerrar_mes(
        nivel_id, anio, mes, cerrado_por_id=token_payload.get("persona_id")
    )


# --- Justificativos (E03-RF006a/RF006b) -------------------------------------
@router.get(
    "/justificativos/pendientes", response_model=List[JustificativoResponseDTO],
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def listar_justificativos_pendientes(db: Session = Depends(obtener_sesion)):
    """Listado de justificativos pendientes de evaluación, para el panel de
    revisión del administrador (E03-RF006b)."""
    return RankingServicio(db).listar_justificativos_pendientes()


@router.post(
    "/{persona_id}/justificativos", response_model=JustificativoResponseDTO, status_code=201,
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def crear_justificativo(
    persona_id: int,
    datos: JustificativoCreateDTO,
    db: Session = Depends(obtener_sesion),
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
):
    """Alumno o Representante. La autorización (dueño o representante) se
    valida en el servicio, no aquí -- antes de la existencia, igual que en
    el resto del sistema, para no filtrar existencia de recursos ajenos."""
    return RankingServicio(db).crear_justificativo(
        persona_id_solicitante=token_payload.get("persona_id"),
        datos=datos,
        persona_objetivo_id=persona_id,
    )


@router.get(
    "/{persona_id}/justificativos", response_model=List[JustificativoResponseDTO],
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def listar_justificativos_de_persona(
    persona_id: int,
    db: Session = Depends(obtener_sesion),
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
):
    """Historial completo (cualquier estado, incluyendo RECHAZADO con su
    motivo) de los justificativos de una persona. Alumno o Representante; la
    autorización (dueño o representante) se valida en el servicio, igual que
    en `crear_justificativo`."""
    return RankingServicio(db).listar_justificativos_de_persona(
        persona_id_solicitante=token_payload.get("persona_id"),
        persona_id_objetivo=persona_id,
    )


@router.patch(
    "/justificativos/{justificativo_id}/evaluar", response_model=JustificativoResponseDTO,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN))],
)
async def evaluar_justificativo(
    justificativo_id: int, datos: JustificativoEvaluarDTO, db: Session = Depends(obtener_sesion)
):
    return RankingServicio(db).evaluar_justificativo(justificativo_id, datos)


# --- Reingreso (E03-RF008) ---------------------------------------------------
@router.post(
    "/{persona_id}/reingresar", response_model=ReingresoResponseDTO,
    dependencies=[Depends(GestorPermisos(ROL_ADMIN_O_ENTRENADOR))],
)
async def reingresar(persona_id: int, db: Session = Depends(obtener_sesion)):
    ranking = RankingServicio(db).reingresar(persona_id)
    return ReingresoResponseDTO(
        persona_id=persona_id,
        nivel_ranking_id=ranking.nivel_ranking_id,
        mensaje="Reingreso aplicado en el último nivel registrado",
    )


# --- Selección oficial (E03-RF011) ------------------------------------------
@router.post(
    "/seleccion-oficial", response_model=List[RankingResponseDTO],
    dependencies=[Depends(GestorPermisos(ROL_ADMIN_O_ENTRENADOR))],
)
async def marcar_seleccion_oficial(datos: SeleccionOficialDTO, db: Session = Depends(obtener_sesion)):
    return RankingServicio(db).marcar_seleccion_oficial(datos)


# --- Perfil privado del alumno (E04-RF012) ----------------------------------
@router.get(
    "/{persona_id}/perfil", response_model=PerfilRankingAlumnoDTO,
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def obtener_perfil_alumno(
    persona_id: int,
    db: Session = Depends(obtener_sesion),
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
):
    """Consulta privada: solo el propio alumno o un ADMINISTRADOR/ENTRENADOR
    pueden verla."""
    roles = token_payload.get("roles", [])
    es_propio = token_payload.get("persona_id") == persona_id
    if not es_propio and not any(r in ROL_ADMIN_O_ENTRENADOR for r in roles):
        from app.dominio.excepciones import PermisosInsuficientes
        raise PermisosInsuficientes("No puede consultar el perfil de ranking de otra persona")
    return RankingServicio(db).obtener_perfil_alumno(persona_id)


# --- Notificaciones in-app ---------------------------------------------------
@router.get(
    "/notificaciones/mias", response_model=List[NotificacionResponseDTO],
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def listar_mis_notificaciones(
    db: Session = Depends(obtener_sesion),
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
):
    return NotificacionServicio(db).listar_propias(token_payload.get("persona_id"))


@router.patch(
    "/notificaciones/{notificacion_id}/leer", response_model=NotificacionResponseDTO,
    dependencies=[Depends(GestorAutenticacion.decodificar_token)],
)
async def marcar_notificacion_leida(
    notificacion_id: int,
    db: Session = Depends(obtener_sesion),
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
):
    return NotificacionServicio(db).marcar_leida(notificacion_id, token_payload.get("persona_id"))
