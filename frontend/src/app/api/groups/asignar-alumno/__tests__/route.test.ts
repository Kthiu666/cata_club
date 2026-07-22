/**
 * Route Handler Tests — POST /api/groups/asignar-alumno
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
  return new NextRequest("http://localhost/api/groups/asignar-alumno", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.spyOn(global, "fetch");
  process.env.BACKEND_API_URL = "http://localhost:8000/api/v1";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BACKEND_API_URL;
});

describe("POST /api/groups/asignar-alumno", () => {
  it("returns 401 when no access token cookie is present", async () => {
    const response = await POST(postRequest({ persona_id: 3, horario_id: 1 }));
    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 400 when persona_id/horario_id are missing or non-numeric", async () => {
    const access = makeJwt(3600);
    const response = await POST(
      postRequest({ persona_id: "x" }, `${ACCESS_TOKEN_COOKIE}=${access}`),
    );
    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("proxies POST /asistencias/asignar-alumno with the bearer token and body", async () => {
    const created = {
      id: 10,
      persona_id: 3,
      persona_nombre_completo: "Sofia Martinez",
      horario_id: 1,
      horario_dia: "LUNES",
      horario_hora_inicio: "18:00",
      horario_hora_fin: "20:00",
      fecha_asignacion: "2026-07-01T00:00:00Z",
    };
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(created, 201));

    const access = makeJwt(3600);
    const response = await POST(
      postRequest({ persona_id: 3, horario_id: 1 }, `${ACCESS_TOKEN_COOKIE}=${access}`),
    );
    const body = await response.json();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/asistencias/asignar-alumno",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: `Bearer ${access}` }),
        body: JSON.stringify({ persona_id: 3, horario_id: 1 }),
      }),
    );
    expect(response.status).toBe(201);
    expect(body).toEqual(created);
  });

  it("propagates backend errors", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ message: "Ya asignado" }, 409));

    const access = makeJwt(3600);
    const response = await POST(
      postRequest({ persona_id: 3, horario_id: 1 }, `${ACCESS_TOKEN_COOKIE}=${access}`),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Ya asignado");
  });
});
