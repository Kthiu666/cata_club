/**
 * GET /api/personas/reportes/nuevos-por-periodo/pdf — admin-only BFF binary proxy.
 *
 * Proxies FastAPI's `/personas/reportes/nuevos-por-periodo/pdf` (same date
 * range params as the JSON sibling) and relays the raw PDF bytes verbatim.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyBackendPdfGet } from "@/lib/server/backend-client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const fechaInicio = searchParams.get("fecha_inicio");
  const fechaFin = searchParams.get("fecha_fin");

  if (!fechaInicio || !fechaFin) {
    return NextResponse.json(
      { message: "Los parámetros fecha_inicio y fecha_fin son obligatorios." },
      { status: 400 },
    );
  }

  const qs = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });

  return proxyBackendPdfGet(
    request,
    `/personas/reportes/nuevos-por-periodo/pdf?${qs.toString()}`,
    "No se pudo generar el PDF del reporte.",
  );
}
