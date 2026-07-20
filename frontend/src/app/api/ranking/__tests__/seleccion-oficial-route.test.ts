/**
 * Tests for POST /api/ranking/seleccion-oficial.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../seleccion-oficial/route";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server/auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function postRequest(cookie: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ranking/seleccion-oficial", {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const dto = { estudianteId: "4", categoria: 1, periodo: "2026-07" };

beforeEach(() => {
  vi.spyOn(global, "fetch");
  process.env.BACKEND_API_URL = "http://localhost:8000/api/v1";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BACKEND_API_URL;
});

describe("POST /api/ranking/seleccion-oficial", () => {
  it("returns 401 when the access-token cookie is missing", async () => {
    const response = await POST(postRequest("", dto));

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("translates the frontend DTO into the backend's batch format", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse([{ id: 1, persona_id: 4, seleccion_oficial: true, anio_seleccion: 2026 }], 201),
    );

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, dto));

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/ranking/seleccion-oficial",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer abc123" }),
        body: JSON.stringify({ persona_ids: [4], anio: 2026 }),
      }),
    );
    expect(response.status).toBe(201);
  });

  it("returns 400 for invalid JSON in the request body", async () => {
    const request = new NextRequest("http://localhost/api/ranking/seleccion-oficial", {
      method: "POST",
      headers: { cookie: `${ACCESS_TOKEN_COOKIE}=abc123`, "Content-Type": "application/json" },
      body: "not json {",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 when estudianteId is missing", async () => {
    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, { categoria: 1 }));

    expect(response.status).toBe(400);
  });

  it("propagates a backend error status", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ message: "No tiene permisos para esta operación." }, 403),
    );

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, dto));

    expect(response.status).toBe(403);
  });
});
