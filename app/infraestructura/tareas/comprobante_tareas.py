"""
Tarea Celery: Generación + subida del comprobante PDF de un Pago aprobado.

Flujo:
    1. Lee el Pago + Persona + Membresia + TipoMembresia desde la BD.
    2. Genera el PDF en memoria (ReportLab) -> bytes.
    3. Sube los bytes a Cloudinary (raw, .pdf) -> secure_url.
    4. Persiste un `ComprobantePago` con la URL en la BD (pago_id unique).

El servicio `PagoServicio.validar_pago` dispara `.delay(pago_id)` apenas se
commitea la aprobación del pago, así el endpoint responde rápido y la latencia
de ReportLab + Cloudinary corre en el worker.
"""
from __future__ import annotations

import logging

from app.infraestructura.db import SessionLocal
from app.infraestructura.tareas.celery_app import celery_app
from app.infraestructura.generador_pdf import generar_comprobante_pago_pdf
from app.infraestructura.cloudinary_cliente import subir_pdf_membresia
from app.dominio.modelos import Pago, ComprobantePago
from app.dominio.enums import EstadoPago
from app.dominio.excepciones import EntidadNoEncontrada


logger = logging.getLogger("cataclub.tareas.comprobante")


@celery_app.task(
    name="app.infraestructura.tareas.comprobante_tareas.generar_comprobante_pdf_tarea",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_max=5,
    retry_jitter=True,
)
def generar_comprobante_pdf_tarea(self, pago_id: int) -> dict:
    """
    Genera y sube el comprobante PDF de un pago aprobado.

    Es idempotente respecto a ComprobantePago: si el pago ya tiene un
    comprobante adjunto, la tarea NO regenera (preserva la URL histórica).
    Si en cambio se requiere regenerar, hay otro endpoint explícito para eso.
    
    Returns:
        dict con pago_id, comprobante_url y estadoPago original.
    """
    with SessionLocal() as db:
        pago = db.get(Pago, pago_id)
        if not pago:
            raise EntidadNoEncontrada(f"Pago con id {pago_id} no encontrado")

        if pago.comprobante:
            logger.info(
                "Pago %s ya tiene comprobante (%s). Reutilizando.",
                pago_id, pago.comprobante.archivo_url,
            )
            return {"pago_id": pago_id, "comprobante_url": pago.comprobante.archivo_url}

        if pago.estado_pago != EstadoPago.APROBADO:
            raise RuntimeError(
                f"El pago {pago_id} no está APROBADO (estado={pago.estado_pago}); "
                "no se genera comprobante."
            )

        persona = pago.persona
        membresia = pago.membresia
        tipo = membresia.tipo_membresia

        pdf_bytes = generar_comprobante_pago_pdf(
            pago_id=pago.id,
            persona_nombre=f"{persona.nombres} {persona.apellidos}",
            persona_cedula=persona.cedula,
            persona_telefono=persona.telefono,
            membresia_id=membresia.id,
            membresia_categoria=tipo.categoria,
            monto=pago.monto,
            monto_aplicado=membresia.monto_aplicado,
            estado_pago=pago.estado_pago.value,
            tipo_pago=pago.tipo_pago.value,
            fecha_inicio=pago.fecha_inicio,
            fecha_fin=pago.fecha_fin,
            fecha_aprobacion=pago.fecha_validacion,
            motivo_rechazo=pago.motivo_rechazo,
        )

        public_id = f"comprobante-{pago.id:08d}"
        url = subir_pdf_membresia(pdf_bytes, public_id)

        comprobante = ComprobantePago(
            pago_id=pago.id,
            archivo_url=url,
            formato_archivo="pdf",
        )
        db.add(comprobante)
        db.commit()
        db.refresh(comprobante)

        logger.info("Comprobante creado para pago %s -> %s", pago_id, url)
    return {"pago_id": pago_id, "comprobante_url": url}
