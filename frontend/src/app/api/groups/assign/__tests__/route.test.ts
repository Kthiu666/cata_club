/**
 * Route Handler Tests — POST /api/groups/assign
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
  return new NextRequest("http://localhost/api/groups/assign", {
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

describe("POST /api/groups/assign", () => {
  it("returns 400 when personaId/nivelRankingId are missing or non-numeric", async () => {
    const access = makeJwt(3600);
    const response = await POST(postRequest({ personaId: "3" }, `${ACCESS_TOKEN_COOKIE}=${access}`));
    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends persona_id/nivel_ranking_id (snake_case) to POST /ranking/asignar-nivel-inicial", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ id: 1, personaId: 3, nivelRankingId: 1, puntajeAcumulado: 0 }),
    );

    const access = makeJwt(3600);
    await POST(postRequest({ personaId: 3, nivelRankingId: 1 }, `${ACCESS_TOKEN_COOKIE}=${access}`));

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/ranking/asignar-nivel-inicial",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ persona_id: 3, nivel_ranking_id: 1 }),
        headers: expect.objectContaining({ Authorization: `Bearer ${access}` }),
      }),
    );
  });

  it("passes through the backend's real 403 (ENTRENADOR-only) instead of faking success", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ detail: "Permisos insuficientes para esta operación" }, 403),
    );

    const access = makeJwt(3600);
    const response = await POST(postRequest({ personaId: 3, nivelRankingId: 1 }, `${ACCESS_TOKEN_COOKIE}=${access}`));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toBe("Permisos insuficientes para esta operación");
  });
});
