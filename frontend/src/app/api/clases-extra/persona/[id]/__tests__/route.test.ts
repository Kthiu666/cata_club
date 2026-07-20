/**
 * Route Handler Tests — GET /api/clases-extra/persona/[id]
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

function getRequest(personaId: string, cookie = ""): NextRequest {
  return new NextRequest(`http://localhost/api/clases-extra/persona/${personaId}`, {
    headers: cookie ? { cookie } : {},
  });
}

const history = [
  {
    id: 1,
    fechaClaseSolicitada: "2026-08-01",
    estado: "PENDIENTE",
    costoAdicional: null,
    fechaSolicitud: "2026-07-20T10:00:00Z",
    observaciones: null,
    personaId: 3,
    membresiaId: 7,
    horarioId: 12,
  },
];

beforeEach(() => {
  vi.spyOn(global, "fetch");
  process.env.BACKEND_API_URL = "http://localhost:8000/api/v1";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BACKEND_API_URL;
});

describe("GET /api/clases-extra/persona/[id]", () => {
  it("returns 401 without calling the backend when no auth cookie is present", async () => {
    const response = await GET(getRequest("3"), { params: { id: "3" } });

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls /clases-extra/persona/{id} with Authorization: Bearer", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(history));

    const access = makeJwt(3600);
    const response = await GET(getRequest("3", `${ACCESS_TOKEN_COOKIE}=${access}`), { params: { id: "3" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(history);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/v1/clases-extra/persona/3",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${access}` }),
      }),
    );
  });

  it("returns 400 for a non-numeric persona id", async () => {
    const access = makeJwt(3600);
    const response = await GET(getRequest("abc", `${ACCESS_TOKEN_COOKIE}=${access}`), { params: { id: "abc" } });

    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("propagates the backend's status and message on 403", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ detail: "No autorizado" }, 403));

    const access = makeJwt(3600);
    const response = await GET(getRequest("3", `${ACCESS_TOKEN_COOKIE}=${access}`), { params: { id: "3" } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toBe("No autorizado");
  });
});
