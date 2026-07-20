/**
 * Tests for POST /api/ranking/niveles/:id/cerrar-mes.
 *
 * The BFF translates { periodo: "YYYY-MM" } to query params ?anio=X&mes=Y.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../niveles/[id]/cerrar-mes/route";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server/auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function postRequest(cookie: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ranking/niveles/3/cerrar-mes", {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const dto = { periodo: "2026-07" };

beforeEach(() => {
  vi.spyOn(global, "fetch");
  process.env.BACKEND_API_URL = "http://localhost:8000/api/v1";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BACKEND_API_URL;
});

describe("POST /api/ranking/niveles/:id/cerrar-mes", () => {
  it("returns 401 when the access-token cookie is missing", async () => {
    const response = await POST(postRequest("", dto), { params: { id: "3" } });

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("translates periodo to query params anio and mes", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ nivel_ranking_id: 3, anio: 2026, mes: 7, personas_procesadas: 5 }),
    );

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, dto), {
      params: { id: "3" },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/ranking/niveles/3/cerrar-mes?anio=2026&mes=7",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer abc123" }),
      }),
    );
    expect(response.status).toBe(200);
  });

  it("returns 400 when periodo is missing", async () => {
    const response = await POST(
      postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, {}),
      { params: { id: "3" } },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new NextRequest("http://localhost/api/ranking/niveles/3/cerrar-mes", {
      method: "POST",
      headers: { cookie: `${ACCESS_TOKEN_COOKIE}=abc123`, "Content-Type": "application/json" },
      body: "not json {",
    });

    const response = await POST(request, { params: { id: "3" } });

    expect(response.status).toBe(400);
  });

  it("propagates a 409 conflict when the month is already closed", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ message: "El mes ya fue cerrado para esta categoría." }, 409),
    );

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, dto), {
      params: { id: "3" },
    });

    expect(response.status).toBe(409);
  });

  it("returns 503 when the backend is unreachable", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError("fetch failed"));

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, dto), {
      params: { id: "3" },
    });

    expect(response.status).toBe(503);
  });
});
