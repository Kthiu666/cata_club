/**
 * Tests for POST /api/ranking/justificativos.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server/auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function postRequest(cookie: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ranking/justificativos", {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = { personaId: 3, anio: 2026, mes: 7, motivo: "Viaje familiar" };

const justificativoResponse = {
  id: 10,
  personaId: 3,
  anio: 2026,
  mes: 7,
  motivo: "Viaje familiar",
  archivoUrl: null,
  estado: "PENDIENTE",
  motivoRechazo: null,
  fechaSolicitud: "2026-07-19T10:00:00Z",
  fechaEvaluacion: null,
  evaluadoPorId: null,
};

beforeEach(() => {
  vi.spyOn(global, "fetch");
  process.env.BACKEND_API_URL = "http://localhost:8000/api/v1";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BACKEND_API_URL;
});

describe("POST /api/ranking/justificativos", () => {
  it("returns 401 without calling the backend when no auth cookie is present", async () => {
    const response = await POST(postRequest("", validBody));

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, { personaId: 3 }));

    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("builds /ranking/:personaId/justificativos and translates the body to snake_case", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(justificativoResponse, 201));

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, validBody));

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/ranking/3/justificativos",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer abc123" }),
        body: expect.stringContaining('"motivo":"Viaje familiar"'),
      }),
    );
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json).toEqual(justificativoResponse);
  });

  it("propagates a 409 when a justificativo already exists for the period", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ message: "Ya existe un justificativo para esta persona en ese período" }, 409),
    );

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, validBody));

    expect(response.status).toBe(409);
  });

  it("returns 503 when the backend is unreachable", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError("fetch failed"));

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, validBody));

    expect(response.status).toBe(503);
  });
});
