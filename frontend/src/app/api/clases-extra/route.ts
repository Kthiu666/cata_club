/**
 * POST /api/clases-extra — creates an extra-class request.
 *
 * BFF proxy to FastAPI's `POST /clases-extra/`. The backend requires the
 * caller to be authenticated and validates ownership of the membership.
 * Body fields are translated from camelCase (frontend) to snake_case (backend).
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";
import type { SolicitudClaseExtra } from "@/types/domain";

interface CreateBody {
  fechaClaseSolicitada: string;
  personaId: number;
  membresiaId: number;
  horarioId: number;
  observaciones?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: CreateBody;
  try {
    const raw: unknown = await request.json();
    if (typeof raw !== "object" || raw === null) {
      return NextResponse.json({ message: "El cuerpo de la solicitud no es válido." }, { status: 400 });
    }
    body = raw as CreateBody;
  } catch {
    return NextResponse.json({ message: "El cuerpo de la solicitud no es válido." }, { status: 400 });
  }

  const backendBody = {
    fecha_clase_solicitada: body.fechaClaseSolicitada,
    persona_id: body.personaId,
    membresia_id: body.membresiaId,
    horario_id: body.horarioId,
    ...(body.observaciones ? { observaciones: body.observaciones } : {}),
  };

  const result = await backendFetchAuthed(request, "/clases-extra/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(backendBody),
  });

  if (!result.ok) {
    return NextResponse.json({ message: "No se pudo crear la solicitud." }, { status: result.status });
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudo crear la solicitud.");
  }

  const data = (await result.response.json()) as SolicitudClaseExtra;
  const response = NextResponse.json(data, { status: 201 });
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
