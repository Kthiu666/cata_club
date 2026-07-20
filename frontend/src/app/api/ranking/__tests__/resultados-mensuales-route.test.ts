/**
 * Tests for POST /api/ranking/resultados-mensuales.
 *
 * Mocks the backend via vi.spyOn(global, "fetch") — no live FastAPI needed.
 * Mirrors the style of src/app/api/auth/__tests__/session-route.test.ts.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../resultados-mensuales/route";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server/auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function postRequest(cookie: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ranking/resultados-mensuales", {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const dto = { estudianteId: "stu-001", categoria: 3, periodo: "2026-07", puntos: 12 };

beforeEach(() => {
  vi.spyOn(global, "fetch");
  process.env.BACKEND_API_URL = "http://localhost:8000/api/v1";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BACKEND_API_URL;
});

describe("POST /api/ranking/resultados-mensuales", () => {
  it("returns 401 when the access-token cookie is missing", async () => {
    const response = await POST(postRequest("", dto));

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("forwards the request to the backend with a Bearer token", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ id: "rm-001", ...dto }, 201));

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, dto));

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/ranking/resultados-mensuales",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer abc123" }),
        body: JSON.stringify(dto),
      }),
    );
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.id).toBe("rm-001");
  });

  it("returns 400 for invalid JSON in the request body", async () => {
    const request = new NextRequest("http://localhost/api/ranking/resultados-mensuales", {
      method: "POST",
      headers: { cookie: `${ACCESS_TOKEN_COOKIE}=abc123`, "Content-Type": "application/json" },
      body: "not json {",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("propagates a backend error status and message", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ message: "Solo entrenadores pueden registrar resultados." }, 403),
    );

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, dto));

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.message).toBe("Solo entrenadores pueden registrar resultados.");
  });

  it("returns 503 when the backend is unreachable", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError("fetch failed"));

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, dto));

    expect(response.status).toBe(503);
  });
});
