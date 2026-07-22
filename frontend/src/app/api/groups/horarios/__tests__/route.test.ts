/**
 * Route Handler Tests — GET/POST /api/groups/horarios
 *
 * GET is new (added in the gestion-horarios PR-C bugfix). POST already
 * existed but had no coverage — left untouched here per PR-C's scope
 * (only the GET addition is under test).
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

function getRequest(query = "", cookie = ""): NextRequest {
  return new NextRequest(`http://localhost/api/groups/horarios${query}`, {
    method: "GET",
    headers: cookie ? { cookie } : {},
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

describe("GET /api/groups/horarios", () => {
  it("returns 401 when no access token cookie is present", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("proxies GET /asistencias/horarios with the bearer token", async () => {
    const horarios = [{ id: 1, diaSemana: "LUNES", horaInicio: "18:00", horaFin: "20:00", categoria: "COMPETITIVO", entrenadorId: 5, nivelRankingId: null }];
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(horarios));

    const access = makeJwt(3600);
    const response = await GET(getRequest("", `${ACCESS_TOKEN_COOKIE}=${access}`));
    const body = await response.json();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/asistencias/horarios",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${access}` }) }),
    );
    expect(response.status).toBe(200);
    expect(body).toEqual(horarios);
  });

  it("forwards ?categoria= as a query param (triangulation)", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse([]));

    const access = makeJwt(3600);
    await GET(getRequest("?categoria=FORMATIVO", `${ACCESS_TOKEN_COOKIE}=${access}`));

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/asistencias/horarios?categoria=FORMATIVO",
      expect.anything(),
    );
  });

  it("propagates backend errors", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ message: "Error interno" }, 500));

    const access = makeJwt(3600);
    const response = await GET(getRequest("", `${ACCESS_TOKEN_COOKIE}=${access}`));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Error interno");
  });
});
