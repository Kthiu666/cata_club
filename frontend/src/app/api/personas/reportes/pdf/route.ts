/**
 * GET /api/personas/reportes/pdf — admin-only BFF binary proxy.
 *
 * Proxies FastAPI's `/personas/reportes/pdf` (same filters as the JSON
 * sibling: prioridad_municipal, becado) and relays the raw PDF bytes
 * verbatim, since `backendFetchAuthed` returns the raw `Response` and this
 * one must NOT be parsed as JSON.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const prioridad = searchParams.get("prioridad_municipal");
  const becado = searchParams.get("becado");
  if (prioridad !== null) qs.set("prioridad_municipal", prioridad);
  if (becado !== null) qs.set("becado", becado);
  const query = qs.toString();

  const result = await backendFetchAuthed(request, `/personas/reportes/pdf${query ? `?${query}` : ""}`);
  if (!result.ok) {
    return NextResponse.json({ message: "No se pudo generar el PDF del reporte." }, { status: result.status });
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudo generar el PDF del reporte.");
  }

  const bytes = await result.response.arrayBuffer();
  const response = new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": result.response.headers.get("Content-Disposition") ?? "attachment",
    },
  });
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
