/**
 * Route Handler Tests — GET/PATCH /api/auth/me (Issue #36: perfil propio)
 *
 * GET proxies backend GET /auth/me (now includes telefono). PATCH proxies
 * backend PATCH /auth/me; when the backend reissues tokens (only happens if
 * correo changed), this route must call setAuthCookies to rotate the HttpOnly
 * cookies AND strip the raw token fields out of the JSON body before it
 * reaches browser JS — mirrors the login route's setAuthCookies pattern and
 * session-route's "never leak a token in JSON" contract.
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

  it("forwards correo/telefono to backend PATCH /auth/me", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ ...perfil, telefono: "0987654321" }));

    const access = makeJwt(3600);
    const response = await PATCH(
      patchRequest({ telefono: "0987654321" }, `${ACCESS_TOKEN_COOKIE}=${access}`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.telefono).toBe("0987654321");
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/v1/auth/me",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ telefono: "0987654321" }),
      }),
    );
  });

  it("sets HttpOnly cookies and strips tokens from the JSON body when correo changes", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({
        ...perfil,
        correo: "nueva@cataclub.com",
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      }),
    );

    const access = makeJwt(3600);
    const response = await PATCH(
      patchRequest({ correo: "nueva@cataclub.com" }, `${ACCESS_TOKEN_COOKIE}=${access}`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.correo).toBe("nueva@cataclub.com");
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe("new-access-token");
    expect(JSON.stringify(body)).not.toMatch(/token/i);
  });

  it("does not set the access-token cookie when telefono-only change carries no reissued tokens", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ ...perfil, telefono: "0987654321" }));

    const access = makeJwt(3600);
    const response = await PATCH(
      patchRequest({ telefono: "0987654321" }, `${ACCESS_TOKEN_COOKIE}=${access}`),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)).toBeUndefined();
  });

  it("propagates the backend's duplicate-correo rejection", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ message: "El correo ya está en uso." }, 400),
    );

    const access = makeJwt(3600);
    const response = await PATCH(
      patchRequest({ correo: "duplicado@cataclub.com" }, `${ACCESS_TOKEN_COOKIE}=${access}`),
    );

    expect(response.status).toBe(400);
  });
});
