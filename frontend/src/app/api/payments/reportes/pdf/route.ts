/**
 * GET /api/payments/reportes/pdf — admin-only BFF binary proxy.
 *
 * Proxies FastAPI's `/membresias/pagos/reportes/pdf`. Mirrors
 * `/api/asistencias/reportes/pdf`'s camelCase→snake_case param conversion
 * and `proxyBackendPdfGet` usage.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyBackendPdfGet } from "@/lib/server/backend-client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const fechaInicio = searchParams.get("fechaInicio");
  const fechaFin = searchParams.get("fechaFin");
  const estadoPago = searchParams.get("estadoPago");
  if (fechaInicio) qs.set("fecha_inicio", fechaInicio);
  if (fechaFin) qs.set("fecha_fin", fechaFin);
  if (estadoPago) qs.set("estado_pago", estadoPago);
  const query = qs.toString();
  const queryString = query ? `?${query}` : "";

  return proxyBackendPdfGet(
    request,
    `/membresias/pagos/reportes/pdf${queryString}`,
    "No se pudo generar el PDF del reporte.",
  );
}
