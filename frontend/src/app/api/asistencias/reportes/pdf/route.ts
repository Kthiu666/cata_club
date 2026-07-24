/**
 * GET /api/asistencias/reportes/pdf — admin-only BFF binary proxy.
 *
 * Proxies FastAPI's `/asistencias/reportes/pdf`. IMPORTANT: unlike
 * `/api/attendance/records` (which proxies the JSON `/asistencias/reportes`
 * and allows ADMINISTRADOR + ENTRENADOR), the backend's PDF endpoint is
 * intentionally ADMINISTRADOR-only — this route does not widen that gate,
 * it just relays whatever status FastAPI returns (403 for entrenador).
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyBackendPdfGet } from "@/lib/server/backend-client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const fechaInicio = searchParams.get("fechaInicio");
  const fechaFin = searchParams.get("fechaFin");
  const horarioId = searchParams.get("horarioId");
  const personaId = searchParams.get("personaId");
  if (fechaInicio) qs.set("fecha_inicio", fechaInicio);
  if (fechaFin) qs.set("fecha_fin", fechaFin);
  if (horarioId) qs.set("horario_id", horarioId);
  if (personaId) qs.set("persona_id", personaId);
  const query = qs.toString();
  const queryString = query ? `?${query}` : "";

  return proxyBackendPdfGet(
    request,
    `/asistencias/reportes/pdf${queryString}`,
    "No se pudo generar el PDF del reporte.",
  );
}
