/**
 * GET /api/payments/reportes/pdf — admin-only BFF binary proxy.
 *
 * Proxies FastAPI's `/membresias/pagos/reportes/pdf`. Mirrors
 * `/api/asistencias/reportes/pdf`'s camelCase→snake_case param conversion
 * and `proxyBackendPdfGet` usage.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyBackendPdfGet } from "@/lib/server/backend-client";
import { buildPagosReporteQuery } from "@/lib/server/payments-adapter";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = buildPagosReporteQuery(searchParams);

  return proxyBackendPdfGet(
    request,
    `/membresias/pagos/reportes/pdf${query}`,
    "No se pudo generar el PDF del reporte.",
  );
}
