"""
Tarea Celery: envío del enlace de recuperación de contraseña (E01-RF003).

Mismo patrón que `alertas_tareas.py`: esta tarea NO conoce SMTP. Mientras no
exista un `ServicioNotificaciones` real conectado a un proveedor de correo,
se persiste un log estructurado que simula el envío -- es la "simulación"
aceptada para el alcance académico del proyecto (documentado también en
`alertas_tareas.py`).
"""
import logging

from app.infraestructura.tareas.celery_app import celery_app

logger = logging.getLogger("cataclub.tareas.recuperacion")
logger.setLevel(logging.INFO)


@celery_app.task(
    name="app.infraestructura.tareas.recuperacion_tareas.enviar_enlace_recuperacion",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_max=3,
    retry_jitter=True,
)
def enviar_enlace_recuperacion(self, correo: str, token: str) -> dict:
    """
    En producción, aquí se llamaría a `ServicioNotificaciones.enviar_correo(...)`
    con una plantilla que incluya un enlace tipo
    `https://<frontend>/restablecer-contrasenia?token=<token>`.
    Por ahora se deja el log estructurado como simulación del envío.
    """
    logger.info("[RECUPERAR_CONTRASENIA] correo=%s token=%s", correo, token)
    return {"correo": correo, "enviado": True}
