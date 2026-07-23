/**
 * Route Handler Tests — DELETE /api/groups/desasignar-alumno
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DELETE } from "../route";
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

function deleteRequest(query: string, cookie = ""): NextRequest {
  return new NextRequest(`http://localhost/api/groups/desasignar-alumno${query}`, {
    method: "DELETE",
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

describe("DELETE /api/groups/desasignar-alumno", () => {
  it("returns 401 when no access token cookie is present", async () => {
    const response = await DELETE(deleteRequest("?persona_id=3&horario_id=1"));
    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 400 when persona_id/horario_id query params are missing or non-numeric", async () => {
    const access = makeJwt(3600);
    const response = await DELETE(
      deleteRequest("?persona_id=abc", `${ACCESS_TOKEN_COOKIE}=${access}`),
    );
    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("proxies DELETE /asistencias/desasignar-alumno?persona_id=X&horario_id=Y", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    const access = makeJwt(3600);
    const response = await DELETE(
      deleteRequest("?persona_id=3&horario_id=1", `${ACCESS_TOKEN_COOKIE}=${access}`),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/asistencias/desasignar-alumno?persona_id=3&horario_id=1",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ Authorization: `Bearer ${access}` }),
      }),
    );
    expect(response.status).toBe(204);
  });

  it("targets different persona/horario ids (triangulation)", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    const access = makeJwt(3600);
    await DELETE(deleteRequest("?persona_id=9&horario_id=4", `${ACCESS_TOKEN_COOKIE}=${access}`));

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/asistencias/desasignar-alumno?persona_id=9&horario_id=4",
      expect.anything(),
    );
  });

  it("propagates backend errors", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ message: "No encontrado" }, 404));

    const access = makeJwt(3600);
    const response = await DELETE(
      deleteRequest("?persona_id=3&horario_id=1", `${ACCESS_TOKEN_COOKIE}=${access}`),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("No encontrado");
  });
});
