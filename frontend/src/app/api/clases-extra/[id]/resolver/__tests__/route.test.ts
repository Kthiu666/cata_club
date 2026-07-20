/**
 * Route Handler Tests — PATCH /api/clases-extra/[id]/resolver
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

function base64Url(input: string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeJwt(expSecondsFromNow: number): string {
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const payload = base64Url(JSON.stringify({ sub: "1", exp }));
  return `${header}.${payload}.sig`;
}

function patchRequest(id: string, body: unknown, cookie = ""): NextRequest {
  return new NextRequest(`http://localhost/api/clases-extra/${id}/resolver`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

const resolved = {
  id: 1,
  fechaClaseSolicitada: "2026-08-01",
  estado: "APROBADA",
  costoAdicional: "15.00",
  fechaSolicitud: "2026-07-20T10:00:00Z",
  observaciones: "Aprobada",
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

describe("PATCH /api/clases-extra/[id]/resolver", () => {
  it("returns 401 without calling the backend when no auth cookie is present", async () => {
    const response = await PATCH(patchRequest("1", { estado: "APROBADA" }), { params: { id: "1" } });

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls /clases-extra/{id}/resolver with snake_case body and Authorization: Bearer", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(resolved));

    const access = makeJwt(3600);
    const response = await PATCH(
      patchRequest("1", { estado: "APROBADA", costoAdicional: "15.00", observaciones: "Aprobada" }, `${ACCESS_TOKEN_COOKIE}=${access}`),
      { params: { id: "1" } },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(resolved);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/v1/clases-extra/1/resolver",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: `Bearer ${access}`,
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          estado: "APROBADA",
          costo_adicional: "15.00",
          observaciones: "Aprobada",
        }),
      }),
    );
  });

  it("returns 400 for a non-numeric solicitud id", async () => {
    const access = makeJwt(3600);
    const response = await PATCH(
      patchRequest("abc", { estado: "APROBADA" }, `${ACCESS_TOKEN_COOKIE}=${access}`),
      { params: { id: "abc" } },
    );

    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("propagates the backend's status and message on 403", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ detail: "No autorizado" }, 403));

    const access = makeJwt(3600);
    const response = await PATCH(
      patchRequest("1", { estado: "APROBADA" }, `${ACCESS_TOKEN_COOKIE}=${access}`),
      { params: { id: "1" } },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toBe("No autorizado");
  });
});
