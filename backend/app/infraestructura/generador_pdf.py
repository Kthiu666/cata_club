"""
Generador de comprobantes PDF en memoria (ReportLab).

Reglas del servicio:
    - El PDF se construye en un `io.BytesIO` (memoria) y se devuelve como
      `bytes`. NUNCA se persiste en disco del servidor.
    - La responsabilidad termina aquí: la subida a Cloudinary la hace
      `cloudinary_cliente`.
"""
from __future__ import annotations

import io
from datetime import datetime, date
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable,
)


def generar_comprobante_pago_pdf(
    *,
    pago_id: int,
    persona_nombre: str,
    persona_cedula: str,
    persona_telefono: str,
    membresia_id: int,
    membresia_categoria: str,
    monto: Decimal,
    monto_aplicado: Decimal,
    estado_pago: str,
    tipo_pago: str,
    fecha_inicio: date,
    fecha_fin: date,
    fecha_aprobacion: datetime,
    motivo_rechazo: str | None = None,
) -> bytes:
    """
    Construye un PDF de comprobante digital de pago en memoria y devuelve bytes.

    El PDF incluye:
      - Encabezado de la academia (cata club)
      - Datos del alumno (nombre, cédula, teléfono)
      - Detalle del pago (monto, tipo, estado, fechas)
      - Sello de aprobación / datos de rechazo (si aplica)
      - Pie de página con timestamp de emisión

    El buffer se cierra internamente para liberar conexiones de ReportLab.
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=16 * mm,
        title=f"Comprobante de Pago #{pago_id}",
        author="Cata Club - Academia de Tenis",
    )

    estilos = getSampleStyleSheet()
    titulo = ParagraphStyle(
        "TituloComprobante", parent=estilos["Title"],
        fontSize=18, textColor=colors.HexColor("#0B3D91"), spaceAfter=4,
    )
    subtitulo = ParagraphStyle(
        "Sub", parent=estilos["Normal"],
        fontSize=10, textColor=colors.grey, spaceAfter=10,
    )
    cuerpo = ParagraphStyle(
        "Cuerpo", parent=estilos["Normal"], fontSize=10, leading=14,
    )
    sello = ParagraphStyle(
        "Sello", parent=estilos["Normal"],
        fontSize=14, textColor=colors.HexColor("#1B8F2E"),
        alignment=1, spaceBefore=12, spaceAfter=12,
    )

    elementos = [
        Paragraph("Cata Club - Academia de Tenis", titulo),
        Paragraph("Comprobante digital de pago de membresía", subtitulo),
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0B3D91")),
        Spacer(1, 8),

        Paragraph(f"<b>Nº de comprobante:</b> P-2024-{pago_id:06d}", cuerpo),
        Paragraph(
            f"<b>Fecha de aprobación:</b> {fecha_aprobacion.strftime('%d/%m/%Y %H:%M')}",
            cuerpo,
        ),
        Spacer(1, 10),

        Paragraph("<b>Datos del alumno</b>", estilos["Heading3"]),
        Paragraph(f"Nombre: {persona_nombre}", cuerpo),
        Paragraph(f"Cédula: {persona_cedula}", cuerpo),
        Paragraph(f"Teléfono: {persona_telefono}", cuerpo),
        Spacer(1, 10),

        Paragraph("<b>Detalle de la membresía</b>", estilos["Heading3"]),
        Paragraph(f"Categoría: {membresia_categoria}", cuerpo),
        Paragraph(f"Membresía Nº: {membresia_id}", cuerpo),
        Spacer(1, 10),

        Paragraph("<b>Detalle del pago</b>", estilos["Heading3"]),
    ]

    tabla_datos: list[list[str]] = [
        ["Concepto", "Valor"],
        ["Monto pagado", f"USD {monto:.2f}"],
        ["Monto aplicado", f"USD {monto_aplicado:.2f}"],
        ["Tipo de pago", tipo_pago],
        ["Estado", estado_pago],
        ["Vigencia desde", fecha_inicio.strftime("%d/%m/%Y")],
        ["Vigencia hasta", fecha_fin.strftime("%d/%m/%Y")],
    ]
    if motivo_rechazo:
        tabla_datos.append(["Motivo de rechazo", motivo_rechazo])

    tabla = Table(tabla_datos, colWidths=[60 * mm, 90 * mm], hAlign="LEFT")
    tabla.setStyle(_estilo_tabla())
    elementos.append(tabla)
    elementos.append(Spacer(1, 18))

    if estado_pago.upper() == "APROBADO":
        elementos.append(Paragraph("PAGO APROBADO - MEMBRESÍA ACTIVA", sello))
    elif estado_pago.upper() == "RECHAZADO":
        sello_rechazo = ParagraphStyle(
            "SelloRechazo", parent=sello, textColor=colors.HexColor("#B22222"),
        )
        elementos.append(Paragraph("PAGO RECHAZADO", sello_rechazo))
    else:
        elementos.append(Paragraph(f"Estado: {estado_pago}", cuerpo))

    elementos.append(Spacer(1, 24))
    elementos.append(HRFlowable(width="50%", thickness=0.5, color=colors.grey))
    elementos.append(Paragraph(
        f"Documento generado electrónicamente el "
        f"{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}."
        f" Valor sin firma física tiene plena validez interna.",
        ParagraphStyle("Pie", parent=cuerpo, fontSize=8, textColor=colors.grey),
    ))

    doc.build(elementos)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def _estilo_tabla() -> TableStyle:
    """Devuelve los estilos de la tabla de detalle (TableStyle)."""
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B3D91")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#BBBBBB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.HexColor("#F3F6FF")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ])


def generar_reporte_personas_pdf(
    personas: list[dict],
    titulo_reporte: str = "Reporte de Personas",
) -> bytes:
    """Genera un PDF con el listado de personas en formato tabla.

    Recibe una lista de dicts con los campos de PersonaResponseDTO
    (id, nombres, apellidos, cedula, telefono, fecha_nacimiento,
    prioridad_municipal, porcentaje_beca, motivo_beca).
    """
    import io as io_mod
    from reportlab.lib import colors as clr
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
    )

    buffer = io_mod.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title=titulo_reporte,
        author="Cata Club - Academia de Tenis",
    )

    estilos = getSampleStyleSheet()
    titulo_style = ParagraphStyle(
        "TituloReporte", parent=estilos["Title"],
        fontSize=16, textColor=clr.HexColor("#0B3D91"), spaceAfter=6,
    )
    fecha_style = ParagraphStyle(
        "FechaReporte", parent=estilos["Normal"],
        fontSize=9, textColor=clr.grey, spaceAfter=10,
    )

    elementos = [
        Paragraph("Cata Club - Academia de Tenis", titulo_style),
        Paragraph(titulo_reporte, estilos["Heading2"]),
        Paragraph(
            f"Emitido: {__import__('datetime').datetime.now().strftime('%d/%m/%Y %H:%M')}  |  "
            f"Registros: {len(personas)}",
            fecha_style,
        ),
        HRFlowable(width="100%", thickness=1, color=clr.HexColor("#0B3D91")),
        Spacer(1, 8),
    ]

    if not personas:
        elementos.append(Paragraph("No se encontraron registros.", estilos["Normal"]))
    else:
        headers = ["Nº", "Nombres", "Apellidos", "Cédula", "Teléfono",
                   "F. Nacimiento", "Prioridad", "Beca %", "Motivo Beca"]
        data = [headers]
        for i, p in enumerate(personas, 1):
            data.append([
                str(i),
                str(p.get("nombres", "")),
                str(p.get("apellidos", "")),
                str(p.get("cedula", "")),
                str(p.get("telefono", "")),
                str(p.get("fechaNacimiento", "")),
                "Sí" if p.get("prioridadMunicipal") else "No",
                str(p.get("porcentajeBeca", 0)),
                str(p.get("motivoBeca") or ""),
            ])

        col_widths = [25, 80, 80, 70, 65, 70, 48, 40, 120]
        table = Table(data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), clr.HexColor("#0B3D91")),
            ("TEXTCOLOR", (0, 0), (-1, 0), clr.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.25, clr.HexColor("#BBBBBB")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [clr.whitesmoke, clr.HexColor("#F3F6FF")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elementos.append(table)

    doc.build(elementos)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
