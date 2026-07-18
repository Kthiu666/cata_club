"""
Tarea Celery Beat diaria: Alertas de Vencimiento de Membresías.

Regla de negocio:
    Cada noche se buscan pagos APROBADOS cuyo `fecha_fin` sea exactamente HOY + 5
    días, y se dispara una alerta/notificación asociada a la membresía vigente.

Justificación del modelo:
    `Membresia` NO tiene `fecha_vencimiento` propio (decisión de diseño: reusar
    `Pago.fecha_fin` como vigencia). Por eso la query se hace sobre Pago, no
    sobre Membresia. Se filtra por `EstadoPago.APROBADO` y se une a la membresía
    ACTIVA para no alertar sobre pagos rechazados/pendientes.

Notificaciones:
    Esta tarea NO conoce SMTP ni WhatsApp. Llama a un `ServicioNotificaciones`
    que es el adaptador de mensajería. Mientras ese adaptador no exista o éste
    sea un dry-run, se persiste un log estructurado que simula la notificación.
"""
from datetime import date, timedelta
import logging

from sqlalchemy import select

from app.infraestructura.db import SessionLocal
from app.infraestructura.tareas.celery_app import celery_app
from app.dominio.modelos import Pago, Membresia, Persona
from app.dominio.enums import EstadoPago, EstadoMembresia


logger = logging.getLogger("cataclub.tareas.alertas")
logger.setLevel(logging.INFO)


@celery_app.task(
    name="app.infraestructura.tareas.alertas_tareas.alertar_vencimientos_hoy_mas_5",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_max=3,
    retry_jitter=True,
)
def alertar_vencimientos_hoy_mas_5(self) -> dict:
    """
    Ejecución diaria: alerta a los alumnos cuyas membresías vencen en 5 días.

    Returns:
        dict con resumen ejecutable de la corrida (snapshot útil para logging
        y para mostrar en un panel de salud del systema).
    """
    hoy = date.today()
    fecha_objetivo = hoy + timedelta(days=5)

    alertas_enviadas: list[dict] = []

    with SessionLocal() as db:
        stmt = (
            select(Pago, Membresia, Persona)
            .join(Membresia, Membresia.id == Pago.membresia_id)
            .join(Persona, Persona.id == Pago.persona_id)
            .where(
                Pago.estado_pago == EstadoPago.APROBADO,
                Pago.fecha_fin == fecha_objetivo,
                Membresia.estado == EstadoMembresia.ACTIVA,
            )
        )
        filas = db.execute(stmt).all()

        for pago, membresia, persona in filas:
            try:
                _disparar_notificacion_vencimiento(persona, membresia, pago, fecha_objetivo)
                alertas_enviadas.append({
                    "pago_id": pago.id,
                    "membresia_id": membresia.id,
                    "persona_id": persona.id,
                    "vence": pago.fecha_fin.isoformat(),
                })
            except Exception as exc:
                logger.exception(
                    "Fallo notificando vencimiento (pago_id=%s)", pago.id
                )
                raise

    logger.info(
        "Alertas vencimiento %s -> %d notificaciones enviadas",
        fecha_objetivo.isoformat(),
        len(alertas_enviadas),
    )
    return {
        "fecha_objetivo": fecha_objetivo.isoformat(),
        "total_alertas": len(alertas_enviadas),
        "alertas": alertas_enviadas,
    }


def _disparar_notificacion_vencimiento(
    persona: Persona, membresia: Membresia, pago: Pago, vence: date
) -> None:
    """
    Simula el disparo de una notificación. En producción se reemplaza por una
    llamada a `ServicioNotificaciones` (infraestructura/SMTP, WhatsApp, push),
    inyectado aquí (DI) — por ahora dejamos un log estructurado que es la
    'simulación' pedida por el enunciado.
    """
    logger.info(
        "[NOTIFICAR_VENCIMIENTO] "
        "persona_id=%s cedula=%s telefono=%s "
        "membresia_id=%s vence=%s",
        persona.id,
        persona.cedula,
        persona.telefono,
        membresia.id,
        vence.isoformat(),
    )
