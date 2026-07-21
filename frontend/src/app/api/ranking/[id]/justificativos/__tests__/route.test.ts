/**
 * Route Handler Tests — GET /api/ranking/:id/justificativos
 *
 * Mocks the backend via vi.spyOn(global, "fetch") — no live FastAPI needed.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../route";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server/auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function base64Url(input: string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeJwt(expSecondsFromNow: number): string {
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const payload = base64Url(JSON.stringify({ sub: "1", exp }));
  return `${header}.${payload}.sig`;
}

function getRequest(cookie = ""): NextRequest {
  return new NextRequest("http://localhost/api/ranking/9/justificativos", {
    headers: cookie ? { cookie } : {},
  });
}

const justificativoRechazado = {
  id: 8,
  personaId: 9,
  anio: 2026,
  mes: 7,
  motivo: "Cirugía menor programada",
  archivoUrl: null,
  estado: "RECHAZADO",
  motivoRechazo: "Comprobante ilegible",
  fechaSolicitud: "2026-07-21T12:50:02.735616",
  fechaEvaluacion: "2026-07-21T13:00:00.000000",
  evaluadoPorId: 1,
};

beforeEach(() => {
  vi.spyOn(global, "fetch");
  process.env.BACKEND_API_URL = "http://localhost:8000/api/v1";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BACKEND_API_URL;
});

describe("GET /api/ranking/:id/justificativos", () => {
  it("returns 401 without calling the backend when no auth cookie is present", async () => {
    const response = await GET(getRequest(), { params: { id: "9" } });

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("passes through /ranking/:id/justificativos unmodified, including motivoRechazo", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse([justificativoRechazado]));

    const access = makeJwt(3600);
    const response = await GET(getRequest(`${ACCESS_TOKEN_COOKIE}=${access}`), { params: { id: "9" } });
    const body = await response.json();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/ranking/9/justificativos",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${access}` }) }),
    );
    expect(response.status).toBe(200);
    expect(body).toEqual([justificativoRechazado]);
  });

  it("propagates the backend's status and message on failure (e.g. persona ajena)", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ detail: "Solo el propio alumno o su representante pueden ver este historial" }, 403),
    );

    const access = makeJwt(3600);
    const response = await GET(getRequest(`${ACCESS_TOKEN_COOKIE}=${access}`), { params: { id: "9" } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toBe("Solo el propio alumno o su representante pueden ver este historial");
  });
});
