/**
 * Route Handler Tests — GET/PATCH /api/auth/me (Issue #36: perfil propio)
 *
 * GET proxies backend GET /auth/me (now includes telefono). PATCH proxies
 * backend PATCH /auth/me for telefono only — correo is never accepted or
 * forwarded (it's the JWT `sub` claim; self-service editing was removed by
 * design). The accessToken/refreshToken stripping in the route is defensive
 * leftover from when correo changes used to reissue tokens.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, PATCH } from "../route";
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
  return new NextRequest("http://localhost/api/auth/me", {
    headers: cookie ? { cookie } : {},
  });
}

function patchRequest(body: unknown, cookie = ""): NextRequest {
  return new NextRequest("http://localhost/api/auth/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

const perfil = {
  correo: "ana.torres@cataclub.com",
  personaId: 7,
  nombres: "Ana",
  apellidos: "Torres",
  roles: ["ENTRENADOR"],
  telefono: "0991234567",
  fechaCreacion: "2024-03-10T14:22:05.123456",
};

beforeEach(() => {
  vi.spyOn(global, "fetch");
  process.env.BACKEND_API_URL = "http://localhost:8000/api/v1";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BACKEND_API_URL;
});

describe("GET /api/auth/me", () => {
  it("returns 401 without calling the backend when no auth cookie is present", async () => {
    const response = await GET(getRequest());

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls backend GET /auth/me with Authorization: Bearer and returns telefono", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(perfil));

    const access = makeJwt(3600);
    const response = await GET(getRequest(`${ACCESS_TOKEN_COOKIE}=${access}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(perfil);
    expect(body.telefono).toBe("0991234567");
    // Issue #36 (account creation date): the backend's camelCase alias
    // generator already produces `fechaCreacion` — this route is a plain
    // passthrough, no explicit field mapping is needed. This test just
    // confirms the field survives the round trip unmodified.
    expect(body.fechaCreacion).toBe("2024-03-10T14:22:05.123456");
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/v1/auth/me",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${access}` }),
      }),
    );
  });

  it("propagates the backend's error status", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ detail: "No autorizado" }, 403));

    const access = makeJwt(3600);
    const response = await GET(getRequest(`${ACCESS_TOKEN_COOKIE}=${access}`));

    expect(response.status).toBe(403);
  });
});

describe("PATCH /api/auth/me", () => {
  it("returns 401 without calling the backend when no auth cookie is present", async () => {
    const response = await PATCH(patchRequest({ telefono: "0987654321" }));

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("forwards telefono to backend PATCH /auth/me", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ ...perfil, telefono: "0987654321" }));

    const access = makeJwt(3600);
    const response = await PATCH(
      patchRequest({ telefono: "0987654321" }, `${ACCESS_TOKEN_COOKIE}=${access}`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.telefono).toBe("0987654321");
    expect(body.fechaCreacion).toBe("2024-03-10T14:22:05.123456");
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/v1/auth/me",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ telefono: "0987654321" }),
      }),
    );
  });

  it("never forwards a correo field, even if present in the request body", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ ...perfil, telefono: "0987654321" }));

    const access = makeJwt(3600);
    await PATCH(
      patchRequest(
        { correo: "nueva@cataclub.com", telefono: "0987654321" },
        `${ACCESS_TOKEN_COOKIE}=${access}`,
      ),
    );

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/v1/auth/me",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ telefono: "0987654321" }),
      }),
    );
  });

  it("does not set the access-token cookie on an ordinary telefono update", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ ...perfil, telefono: "0987654321" }));

    const access = makeJwt(3600);
    const response = await PATCH(
      patchRequest({ telefono: "0987654321" }, `${ACCESS_TOKEN_COOKIE}=${access}`),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)).toBeUndefined();
  });
});
