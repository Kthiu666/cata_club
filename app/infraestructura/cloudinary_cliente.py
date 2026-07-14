"""
Adaptador de persistencia de archivos: Cloudinary.

Encapsula el SDK `cloudinary` y `cloudinary.uploader` para que el resto del
código dependa de una interfaz propia (no del SDK directo). Esto facilita tests
(reemplazable por un double) y protege al dominio de detalles de vendor.

Recurso PDF en Cloudinary:
    Cloudinary trata los PDF como `resource_type="raw"` (los `image` son para
    formatos raster/vector procesables). Por eso el upload usa raw.
"""
from __future__ import annotations

import logging
from typing import Optional

import cloudinary
import cloudinary.uploader

from app.soporte_transversal.configuracion import settings


logger = logging.getLogger("cataclub.cloudinary")


def _configurar_cliente() -> None:
    """Inicializa el cliente de Cloudinary con las credenciales del entorno.
    Idempotente: re-aplicar la config sobreescribe pero no corrompe el state."""
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,  # SIEMPRE HTTPS para las URLs públicas devueltas
    )


def subir_pdf_membresia(
    contenido_pdf: bytes,
    nombre_publico: str,
    sobreescribir: bool = False,
) -> str:
    """
    Sube un PDF (en bytes, en memoria) a Cloudinary como recurso `raw` y
    devuelve la URL pública segura (https).

    Args:
        contenido_pdf: bytes en memoria del PDF (NO toca el disco del server).
        nombre_publico: public_id que tendrá el recurso en Cloudinary.
        sobreescribir: si True, permite pisar un public_id ya existente.

    Returns:
        URL pública HTTPS del recurso subido (ej.
        https://res.cloudinary.com/<cloud>/raw/upload/<id>.pdf).
    """
    _configurar_cliente()

    if not contenido_pdf:
        raise ValueError("El contenido del PDF está vacío; no se puede subir.")

    upload_kwargs = {
        "resource_type": "raw",
        "public_id": nombre_publico,
        "folder": settings.cloudinary_carpeta_comprobantes,
        "overwrite": sobreescribir,
        "invalidate": True,  # invalida la CDN al sobreescribir
        # Forzamos el formato `.pdf` porque Cloudinary no lo agrega solo en raw.
        "format": "pdf",
    }

    try:
        resultado = cloudinary.uploader.upload(contenido_pdf, **upload_kwargs)
    except Exception as exc:
        logger.exception("Fallo subiendo PDF a Cloudinary (public_id=%s)", nombre_publico)
        raise RuntimeError(f"Error subiendo PDF a Cloudinary: {exc}") from exc

    url: Optional[str] = resultado.get("secure_url")
    if not url:
        # Defensive: si el SDK no devuelve secure_url (imposible con secure=True),
        # construimos una alternativa pero siempre https.
        raise RuntimeError(
            f"Cloudinary no retornó `secure_url` (public_id={nombre_publico})"
        )

    logger.info("PDF subido a Cloudinary: %s", url)
    return url


def subir_voucher_pago(
    contenido: bytes,
    nombre_publico: str,
    content_type: str,
    pago_id: int,
) -> str:
    """
    Sube el voucher/comprobante de transferencia que adjunta el cliente
    (no el PDF oficial generado por el sistema al aprobar un pago — ese usa
    `subir_pdf_membresia`).

    Mapeo por tipo MIME:
      - application/pdf -> resource_type="raw", format="pdf"
      - image/jpeg | image/png -> resource_type="image" (se respeta el formato
        original del cliente; Cloudinary lo detecta, no se fuerza `format`).

    Carpeta destino: `settings.cloudinary_carpeta_vouchers` (separada de la
    carpeta de comprobantes PDF oficiales), para no mezclar conceptos.
    `overwrite=True` + `invalidate=True` permiten al cliente corregir un
    voucher subido erróneamente mientras el pago siga PENDIENTE_VALIDACION.

    Returns:
        URL pública HTTPS del recurso subido.
    """
    _configurar_cliente()

    if not contenido:
        raise ValueError("El contenido del voucher está vacío; no se puede subir.")

    if content_type == "application/pdf":
        upload_kwargs = {
            "resource_type": "raw",
            "public_id": nombre_publico,
            "folder": settings.cloudinary_carpeta_vouchers,
            "overwrite": True,
            "invalidate": True,
            "format": "pdf",
        }
    elif content_type in ("image/jpeg", "image/png"):
        # resource_type="image": Cloudinary gestiona el formato y permite
        # thumbnails/transformaciones; no se fuerza `format` para respetar el
        # formato original (jpg/png) que trae el archivo del cliente.
        upload_kwargs = {
            "resource_type": "image",
            "public_id": nombre_publico,
            "folder": settings.cloudinary_carpeta_vouchers,
            "overwrite": True,
            "invalidate": True,
        }
    else:
        raise ValueError(f"Tipo MIME no soportado para voucher: {content_type}")

    try:
        resultado = cloudinary.uploader.upload(contenido, **upload_kwargs)
    except Exception as exc:
        logger.exception(
            "Fallo subiendo voucher a Cloudinary (pago_id=%s, public_id=%s)",
            pago_id, nombre_publico,
        )
        raise RuntimeError(f"Error subiendo voucher a Cloudinary: {exc}") from exc

    url: Optional[str] = resultado.get("secure_url")
    if not url:
        raise RuntimeError(
            f"Cloudinary no retornó `secure_url` (voucher pago_id={pago_id})"
        )

    logger.info("Voucher de pago %d subido a Cloudinary: %s", pago_id, url)
    return url
