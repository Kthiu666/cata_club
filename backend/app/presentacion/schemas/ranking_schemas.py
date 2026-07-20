"""
Schemas del módulo de Ranking (E03), agregado en la integración con el
frontend. El "nivel de ranking" reemplaza al concepto de "Grupo" que se
había explorado del lado frontend: aquí un nivel ES el grupo de
entrenamiento (confirmado con el equipo), no dos cosas separadas.
"""
from pydantic import BaseModel, Field, computed_field
from datetime import datetime
from typing import Optional, List

from app.dominio.enums import EstadoJustificativoRanking, TipoNotificacion
from app.presentacion.schemas.base import ResponseBase


# --- NivelRanking (E03-RF001) ------------------------------------------------
class NivelRankingCreateDTO(BaseModel):
    numero_nivel: int = Field(..., ge=1)
    nombre: Optional[str] = Field(default=None, max_length=80)


class NivelRankingResponseDTO(ResponseBase, BaseModel):
    id: int
    numero_nivel: int
    nombre: Optional[str] = None
    capacidad_minima: int
    capacidad_maxima: int

    @computed_field
    @property
    def nivel_categoria(self) -> str:
        """Categoría agrupada para el frontend: 1-3 principiante, 4-6 intermedio, 7-10 avanzado."""
        if self.numero_nivel <= 3:
            return "principiante"
        elif self.numero_nivel <= 6:
            return "intermedio"
        return "avanzado"


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
class RankingResponseDTO(ResponseBase, BaseModel):
    id: int = Field(..., examples=[1])
    persona_id: int = Field(..., examples=[1])
    puntaje_acumulado: int = Field(..., examples=[150])
    posicion_actual: Optional[int] = Field(default=None, examples=[1])
    participo: bool = Field(..., examples=[True])
    esta_en_ranking: bool = Field(..., examples=[True])
    nivel_ranking_id: Optional[int] = Field(default=None, examples=[2])
    meses_consecutivos_ausente: int = Field(..., examples=[0])
    seleccion_oficial: bool = Field(..., examples=[False])
    anio_seleccion: Optional[int] = Field(default=None, examples=[None])


class TablaRankingItemDTO(ResponseBase, BaseModel):
    """Fila de la tabla de un nivel (E03-RF010): posición + puntaje +
    identificación del alumno, sin exponer el resto del Ranking."""
    persona_id: int
    persona_nombre_completo: str
    posicion_actual: Optional[int] = None
    puntaje_acumulado: int
    esta_en_ranking: bool


# --- Resultado mensual (E03-RF003) ------------------------------------------
class ResultadoMensualRegistrarDTO(BaseModel):
    persona_id: int
    anio: int = Field(..., ge=2020)
    mes: int = Field(..., ge=1, le=12)
    posicion: Optional[int] = Field(default=None, ge=1)
    participo: bool


class ResultadoMensualResponseDTO(ResponseBase, BaseModel):
    id: int
    persona_id: int
    nivel_ranking_id: int
    anio: int
    mes: int
    posicion: Optional[int] = None
    puntos_obtenidos: int
    participo: bool
    ausencia_justificada: bool


# --- Cierre mensual (E03-RF004/RF005/RF007/RF009) ---------------------------
class SugerenciaMovimientoDTO(BaseModel):
    persona_id: int
    persona_nombre_completo: str
    tipo: str  # "ASCENSO" | "DESCENSO"
    nivel_actual_id: int
    nivel_sugerido_id: int


class CierreMensualResponseDTO(ResponseBase, BaseModel):
    nivel_ranking_id: int
    anio: int
    mes: int
    personas_procesadas: int
    personas_eliminadas: List[int]
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


class JustificativoResponseDTO(ResponseBase, BaseModel):
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


# --- Reingreso (E03-RF008) ---------------------------------------------------
class ReingresoResponseDTO(ResponseBase, BaseModel):
    persona_id: int
    nivel_ranking_id: int
    mensaje: str


# --- Selección oficial (E03-RF011) ------------------------------------------
class SeleccionOficialDTO(BaseModel):
    persona_ids: List[int]
    anio: int = Field(..., ge=2020)


# --- Perfil del alumno (E04-RF012) ------------------------------------------
class PerfilRankingAlumnoDTO(ResponseBase, BaseModel):
    persona_id: int
    posicion_actual: Optional[int] = None
    puntaje_acumulado: int
    nivel_ranking_id: Optional[int] = None
    nivel_ranking_nombre: Optional[str] = None
    esta_en_ranking: bool


# --- Notificaciones -----------------------------------------------------------
class NotificacionResponseDTO(ResponseBase, BaseModel):
    id: int
    tipo: TipoNotificacion
    mensaje: str
    leida: bool
    fecha_creacion: datetime
    entidad_relacionada_id: Optional[int] = None


# --- Listados para frontend (Phase 1) ----------------------------------------
class AsignacionRankingResponseDTO(ResponseBase, BaseModel):
    """Fila de un alumno en el ranking (para listado de asignaciones)."""
    persona_id: int
    persona_nombre_completo: str
    nivel_ranking_id: int
    nivel_ranking_nombre: Optional[str] = None
    nivel_ranking_numero: int
    posicion_actual: Optional[int] = None
    puntaje_acumulado: int
    esta_en_ranking: bool


class ResultadoMensualRankingResponseDTO(ResponseBase, BaseModel):
    """Resultado mensual con info de persona y nivel (para listado)."""
    id: int
    persona_id: int
    persona_nombre_completo: str
    nivel_ranking_id: int
    nivel_ranking_nombre: Optional[str] = None
    anio: int
    mes: int
    posicion: Optional[int] = None
    puntos_obtenidos: int
    participo: bool
    ausencia_justificada: bool


class CierreMensualRankingResponseDTO(ResponseBase, BaseModel):
    """Cierre mensual con info de nivel y cerrado por (para listado)."""
    id: int
    nivel_ranking_id: int
    nivel_ranking_nombre: Optional[str] = None
    nivel_ranking_numero: int
    anio: int
    mes: int
    personas_procesadas: int
    cerrado_por_id: int
    cerrado_por_nombre: str
    cerrado_en: datetime
