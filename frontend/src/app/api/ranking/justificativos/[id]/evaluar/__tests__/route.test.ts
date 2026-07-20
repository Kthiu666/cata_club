/**
 * Tests for PATCH /api/ranking/justificativos/:id/evaluar.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PATCH } from "../route";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server/auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function patchRequest(cookie: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ranking/justificativos/10/evaluar", {
    method: "PATCH",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const justificativoEvaluado = {
  id: 10,
  personaId: 3,
  anio: 2026,
  mes: 7,
  motivo: "Viaje familiar",
  archivoUrl: null,
  estado: "APROBADO",
  motivoRechazo: null,
  fechaSolicitud: "2026-07-19T10:00:00Z",
  fechaEvaluacion: "2026-07-20T09:00:00Z",
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

describe("PATCH /api/ranking/justificativos/:id/evaluar", () => {
  it("returns 401 when the access-token cookie is missing", async () => {
    const response = await PATCH(patchRequest("", { estado: "APROBADO" }), { params: { id: "10" } });

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 400 when estado is not APROBADO/RECHAZADO", async () => {
    const response = await PATCH(patchRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, { estado: "PENDIENTE" }), {
      params: { id: "10" },
    });

    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("forwards the decision and translates motivoRechazo to snake_case", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(justificativoEvaluado));

    const response = await PATCH(
      patchRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, { estado: "APROBADO", motivoRechazo: undefined }),
      { params: { id: "10" } },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/ranking/justificativos/10/evaluar",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ Authorization: "Bearer abc123" }),
        body: JSON.stringify({ estado: "APROBADO", motivo_rechazo: undefined }),
      }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.estado).toBe("APROBADO");
  });

  it("propagates a 400 when the justificativo was already evaluated", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ message: "Este justificativo ya fue evaluado" }, 400),
    );

    const response = await PATCH(patchRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, { estado: "RECHAZADO" }), {
      params: { id: "10" },
    });

    expect(response.status).toBe(400);
  });

  it("returns 503 when the backend is unreachable", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError("fetch failed"));

    const response = await PATCH(patchRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, { estado: "APROBADO" }), {
      params: { id: "10" },
    });

    expect(response.status).toBe(503);
  });
});
