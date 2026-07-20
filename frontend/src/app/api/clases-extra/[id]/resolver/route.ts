/**
 * PATCH /api/clases-extra/[id]/resolver — admin resolves an extra-class request.
 *
 * BFF proxy to FastAPI's `PATCH /clases-extra/{solicitud_id}/resolver`.
 * The backend restricts this to ADMINISTRADOR; we propagate its 401/403.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";
import type { EstadoSolicitudExtra, SolicitudClaseExtra } from "@/types/domain";

interface RouteContext {
  params: { id: string };
}

interface ResolverBody {
  estado: EstadoSolicitudExtra;
  costoAdicional?: string;
  observaciones?: string;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const solicitudId = Number(context.params.id);
  if (Number.isNaN(solicitudId)) {
    return NextResponse.json({ message: "El id de solicitud no es válido." }, { status: 400 });
  }

  let body: ResolverBody;
  try {
    const raw: unknown = await request.json();
    if (typeof raw !== "object" || raw === null) {
      return NextResponse.json({ message: "El cuerpo de la solicitud no es válido." }, { status: 400 });
    }
    body = raw as ResolverBody;
  } catch {
    return NextResponse.json({ message: "El cuerpo de la solicitud no es válido." }, { status: 400 });
  }

  const backendBody: Record<string, unknown> = { estado: body.estado };
  if (body.costoAdicional !== undefined) backendBody.costo_adicional = body.costoAdicional;
  if (body.observaciones !== undefined && body.observaciones !== "") {
    backendBody.observaciones = body.observaciones;
  }

  const result = await backendFetchAuthed(request, `/clases-extra/${solicitudId}/resolver`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(backendBody),
  });

  if (!result.ok) {
    return NextResponse.json({ message: "No se pudo resolver la solicitud." }, { status: result.status });
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudo resolver la solicitud.");
  }

  const data = (await result.response.json()) as SolicitudClaseExtra;
  const response = NextResponse.json(data);
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
