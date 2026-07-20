/**
 * Tests for PATCH /api/ranking/niveles/:id (assign a student to a ranking
 * category). The route now translates numero_nivel → nivel_ranking_id by
 * fetching levels from the backend before calling POST /asignar-nivel-inicial.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PATCH } from "../niveles/[id]/route";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server/auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function patchRequest(cookie: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ranking/niveles/5", {
    method: "PATCH",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const dto = { estudianteId: "3" };

beforeEach(() => {
  vi.spyOn(global, "fetch");
  process.env.BACKEND_API_URL = "http://localhost:8000/api/v1";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BACKEND_API_URL;
});

describe("PATCH /api/ranking/niveles/:id", () => {
  it("returns 401 when the access-token cookie is missing", async () => {
    const response = await PATCH(patchRequest("", dto), { params: { id: "5" } });

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 400 when estudianteId is missing", async () => {
    const response = await PATCH(
      patchRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, {}),
      { params: { id: "5" } },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON in the request body", async () => {
    const request = new NextRequest("http://localhost/api/ranking/niveles/5", {
      method: "PATCH",
      headers: { cookie: `${ACCESS_TOKEN_COOKIE}=abc123`, "Content-Type": "application/json" },
      body: "not json {",
    });

    const response = await PATCH(request, { params: { id: "5" } });

    expect(response.status).toBe(400);
  });

  it("translates numero_nivel to nivel_ranking_id and calls asignar-nivel-inicial", async () => {
    const niveles = [
      { id: 1, numero_nivel: 1 },
      { id: 2, numero_nivel: 2 },
      { id: 5, numero_nivel: 5 },
    ];
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse(niveles))       // GET /ranking/niveles
      .mockResolvedValueOnce(jsonResponse({ id: 10, persona_id: 3, nivel_ranking_id: 5 }));

    const response = await PATCH(
      patchRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, dto),
      { params: { id: "5" } },
    );

    // First call: GET niveles
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/v1/ranking/niveles",
      expect.objectContaining({ method: "GET" }),
    );
    // Second call: POST asignar-nivel-inicial with translated IDs
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8000/api/v1/ranking/asignar-nivel-inicial",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ persona_id: 3, nivel_ranking_id: 5 }),
      }),
    );
    expect(response.status).toBe(200);
  });

  it("returns 404 when numero_nivel is not found in the levels list", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse([{ id: 1, numero_nivel: 1 }]));

    const response = await PATCH(
      patchRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, dto),
      { params: { id: "7" } },
    );

    expect(response.status).toBe(404);
  });

  it("returns 503 when the backend is unreachable", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError("fetch failed"));

    const response = await PATCH(
      patchRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, dto),
      { params: { id: "5" } },
    );

    expect(response.status).toBe(503);
  });
});
