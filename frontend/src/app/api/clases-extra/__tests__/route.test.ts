/**
 * Route Handler Tests — POST /api/clases-extra
 *
 * Mocks the backend via vi.spyOn(global, "fetch"). Covers the BFF proxy
 * contract: cookie -> Authorization: Bearer, snake_case body translation,
 * and error propagation.
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

function base64Url(input: string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeJwt(expSecondsFromNow: number): string {
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const payload = base64Url(JSON.stringify({ sub: "1", exp }));
  return `${header}.${payload}.sig`;
}

function postRequest(body: unknown, cookie = ""): NextRequest {
  return new NextRequest("http://localhost/api/clases-extra", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

const createPayload = {
  fechaClaseSolicitada: "2026-08-01",
  personaId: 3,
  membresiaId: 7,
  horarioId: 12,
  observaciones: "Prueba",
};

const backendResponse = {
  id: 1,
  fechaClaseSolicitada: "2026-08-01",
  estado: "PENDIENTE",
  costoAdicional: null,
  fechaSolicitud: "2026-07-20T10:00:00Z",
  observaciones: "Prueba",
  personaId: 3,
  membresiaId: 7,
  horarioId: 12,
};

beforeEach(() => {
  vi.spyOn(global, "fetch");
  process.env.BACKEND_API_URL = "http://localhost:8000/api/v1";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BACKEND_API_URL;
});

describe("POST /api/clases-extra", () => {
  it("returns 401 without calling the backend when no auth cookie is present", async () => {
    const response = await POST(postRequest(createPayload));

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls /clases-extra/ with snake_case body and Authorization: Bearer", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(backendResponse, 201));

    const access = makeJwt(3600);
    const response = await POST(postRequest(createPayload, `${ACCESS_TOKEN_COOKIE}=${access}`));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual(backendResponse);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/v1/clases-extra/",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${access}`,
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          fecha_clase_solicitada: createPayload.fechaClaseSolicitada,
          persona_id: createPayload.personaId,
          membresia_id: createPayload.membresiaId,
          horario_id: createPayload.horarioId,
          observaciones: createPayload.observaciones,
        }),
      }),
    );
  });

  it("propagates the backend's status and message on 403", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ detail: "No autorizado" }, 403));

    const access = makeJwt(3600);
    const response = await POST(postRequest(createPayload, `${ACCESS_TOKEN_COOKIE}=${access}`));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toBe("No autorizado");
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    const access = makeJwt(3600);
    const request = new NextRequest("http://localhost/api/clases-extra", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `${ACCESS_TOKEN_COOKIE}=${access}`,
      },
      body: "not-json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
