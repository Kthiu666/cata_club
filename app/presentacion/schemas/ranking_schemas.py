"""
Schemas del módulo de Ranking (E03), agregado en la integración con el
frontend. El "nivel de ranking" reemplaza al concepto de "Grupo" que se
había explorado del lado frontend: aquí un nivel ES el grupo de
entrenamiento (confirmado con el equipo), no dos cosas separadas.
"""
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List

from app.dominio.enums import EstadoJustificativoRanking, TipoNotificacion


# --- NivelRanking (E03-RF001) ------------------------------------------------
class NivelRankingCreateDTO(BaseModel):
    numero_nivel: int = Field(..., ge=1)
    nombre: Optional[str] = Field(default=None, max_length=80)


class NivelRankingResponseDTO(BaseModel):
    id: int
    numero_nivel: int
    nombre: Optional[str] = None
    capacidad_minima: int
    capacidad_maxima: int
    model_config = ConfigDict(from_attributes=True)


class NivelRankingConOcupacionDTO(NivelRankingResponseDTO):
    """Igual a NivelRankingResponseDTO, agregando la ocupación actual para
    que el Administrador vea de un vistazo si un nivel necesita rebalanceo
    (RF001 exige un mínimo de 6, que aquí NO se bloquea de forma dura -- ver
    docstring de NivelRanking en modelos.py -- pero sí se informa)."""
    personas_actuales: int
    cupos_disponibles: int
    necesita_revision: bool  # True si personas_actuales < capacidad_minima


# --- Asignación de nivel inicial (E03-RF002) --------------------------------
class AsignarNivelInicialDTO(BaseModel):
    persona_id: int
    nivel_ranking_id: int


# --- Ranking (fila por persona) ---------------------------------------------
class RankingResponseDTO(BaseModel):
    id: int
    persona_id: int
    puntaje_acumulado: int
    posicion_actual: Optional[int] = None
    participo: bool
    esta_en_ranking: bool
    nivel_ranking_id: Optional[int] = None
    meses_consecutivos_ausente: int
    seleccion_oficial: bool
    anio_seleccion: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class TablaRankingItemDTO(BaseModel):
    """Fila de la tabla de un nivel (E03-RF010): posición + puntaje +
    identificación del alumno, sin exponer el resto del Ranking."""
    persona_id: int
    persona_nombre_completo: str
    posicion_actual: Optional[int] = None
    puntaje_acumulado: int
    esta_en_ranking: bool


# --- Resultado mensual (E03-RF003) ------------------------------------------
class ResultadoMensualRegistrarDTO(BaseModel):
    """Registra el resultado de UNA persona en el ranking mensual de un
    nivel. El cierre de mes (POST /ranking/niveles/{id}/cerrar-mes) primero
    exige que ya se hayan registrado los resultados del período; por eso este
    endpoint es independiente y se llama uno por participante antes de cerrar."""
    persona_id: int
    anio: int = Field(..., ge=2020)
    mes: int = Field(..., ge=1, le=12)
    posicion: Optional[int] = Field(default=None, ge=1)
    participo: bool


class ResultadoMensualResponseDTO(BaseModel):
    id: int
    persona_id: int
    nivel_ranking_id: int
    anio: int
    mes: int
    posicion: Optional[int] = None
    puntos_obtenidos: int
    participo: bool
    ausencia_justificada: bool
    model_config = ConfigDict(from_attributes=True)


# --- Cierre mensual (E03-RF004/RF005/RF007/RF009) ---------------------------
class SugerenciaMovimientoDTO(BaseModel):
    persona_id: int
    persona_nombre_completo: str
    tipo: str  # "ASCENSO" | "DESCENSO"
    nivel_actual_id: int
    nivel_sugerido_id: int


class CierreMensualResponseDTO(BaseModel):
    """Resumen de lo que hizo el cierre manual del mes para un nivel:
    puntos calculados, quiénes fueron eliminados por 2 meses consecutivos
    de ausencia sin justificar, y las sugerencias de ascenso/descenso que el
    Entrenador debe revisar y aplicar manualmente (RF009 dice "sugerir", no
    "mover automáticamente")."""
    nivel_ranking_id: int
    anio: int
    mes: int
    personas_procesadas: int
    personas_eliminadas: List[int]  # persona_id de quienes se sacaron del ranking
    sugerencias: List[SugerenciaMovimientoDTO]


# --- Justificativos (E03-RF006a/RF006b) -------------------------------------
class JustificativoCreateDTO(BaseModel):
    anio: int = Field(..., ge=2020)
    mes: int = Field(..., ge=1, le=12)
    motivo: str = Field(..., max_length=255)
    archivo_url: Optional[str] = None


class JustificativoEvaluarDTO(BaseModel):
    estado: EstadoJustificativoRanking
    motivo_rechazo: Optional[str] = Field(default=None, max_length=255)


class JustificativoResponseDTO(BaseModel):
    id: int
    persona_id: int
    anio: int
    mes: int
    motivo: str
    archivo_url: Optional[str] = None
    estado: EstadoJustificativoRanking
    motivo_rechazo: Optional[str] = None
    fecha_solicitud: datetime
    fecha_evaluacion: Optional[datetime] = None
    evaluado_por_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# --- Reingreso (E03-RF008) ---------------------------------------------------
class ReingresoResponseDTO(BaseModel):
    persona_id: int
    nivel_ranking_id: int
    mensaje: str


# --- Selección oficial (E03-RF011) ------------------------------------------
class SeleccionOficialDTO(BaseModel):
    persona_ids: List[int]
    anio: int = Field(..., ge=2020)


# --- Perfil del alumno (E04-RF012) ------------------------------------------
class PerfilRankingAlumnoDTO(BaseModel):
    persona_id: int
    posicion_actual: Optional[int] = None
    puntaje_acumulado: int
    nivel_ranking_id: Optional[int] = None
    nivel_ranking_nombre: Optional[str] = None
    esta_en_ranking: bool


# --- Notificaciones -----------------------------------------------------------
class NotificacionResponseDTO(BaseModel):
    id: int
    tipo: TipoNotificacion
    mensaje: str
    leida: bool
    fecha_creacion: datetime
    entidad_relacionada_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)
