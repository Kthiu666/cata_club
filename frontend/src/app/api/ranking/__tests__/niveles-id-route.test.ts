/**
 * Tests for PATCH /api/ranking/niveles/:id (gap-fill route — see route.ts
 * doc comment: not part of the original ticket, added to make "Asignar
 * Nivel" functional).
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

const dto = { estudianteId: "stu-002" };

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

  it("forwards the category id in the URL, the token as Bearer, and the body", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ success: true }));

    const response = await PATCH(patchRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, dto), {
      params: { id: "5" },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/ranking/niveles/5",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ Authorization: "Bearer abc123" }),
        body: JSON.stringify(dto),
      }),
    );
    expect(response.status).toBe(200);
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

  it("returns 503 when the backend is unreachable", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError("fetch failed"));

    const response = await PATCH(patchRequest(`${ACCESS_TOKEN_COOKIE}=abc123`, dto), {
      params: { id: "5" },
    });

    expect(response.status).toBe(503);
  });
});
