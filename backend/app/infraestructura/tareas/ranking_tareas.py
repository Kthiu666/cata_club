"""
Tarea Celery Beat diaria: Limpieza del Ranking por Inactividad.

Regla de negocio:
    Si un alumno lleva más de 60 días sin registrar actividad (campo
    `ultimo_combate_o_asistencia`), su fila en `Ranking` pasa a
    `esta_en_ranking = False` de forma masiva, para que no figure en los
    endpoints del frontend.

Implementación:
    Se ejecuta un UPDATE masivo. La columna `ultimo_combate_o_asistencia`
    es NULL-safe: si el alumno nunca registró actividad, también se saca del
    ranking (NULL == inactivo desde siempre, > 60 días por definición).
"""
from datetime import datetime, timedelta, timezone
import logging

from sqlalchemy import update

from app.infraestructura.db import SessionLocal
from app.infraestructura.tareas.celery_app import celery_app
from app.dominio.modelos import Ranking


logger = logging.getLogger("cataclub.tareas.ranking")
logger.setLevel(logging.INFO)


# Constante de dominio: 60 días naturales sin actividad.
DIAS_UMBRAL_INACTIVIDAD = 60


@celery_app.task(
    name="app.infraestructura.tareas.ranking_tareas.limpiar_ranking_por_inactividad",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_max=3,
    retry_jitter=True,
)
def limpiar_ranking_por_inactividad(self) -> dict:
    """
    Desactiva masivamente `esta_en_ranking` para filas que cumplan:
        ultimo_combate_o_asistencia IS NULL
        OR ultimo_combate_o_asistencia < (now_utc - 60 días)

    Solo actualiza filas que actualmente tienen esta_en_ranking = True (evita
    churn innecesario y logs ruidosos).

    Returns:
        dict con resumen de la corrida (fecha y total desactivados).
    """
    ahora_utc = datetime.now(timezone.utc)
    limite = ahora_utc - timedelta(days=DIAS_UMBRAL_INACTIVIDAD)

    with SessionLocal() as db:
        stmt = (
            update(Ranking)
            .where(
                Ranking.esta_en_ranking.is_(True),
                (Ranking.ultimo_combate_o_asistencia.is_(None))
                | (Ranking.ultimo_combate_o_asistencia < limite),
            )
            .values(esta_en_ranking=False)
        )
        result = db.execute(stmt)
        db.commit()
        total = result.rowcount or 0

    logger.info(
        "Limpieza ranking: %d filas desactivadas (umbral_inactividad=%s, corte=%s)",
        total,
        DIAS_UMBRAL_INACTIVIDAD,
        limite.isoformat(),
    )
    return {
        "fecha_corrida": ahora_utc.isoformat(),
        "dias_umbral": DIAS_UMBRAL_INACTIVIDAD,
        "total_desactivados": int(total),
    }
