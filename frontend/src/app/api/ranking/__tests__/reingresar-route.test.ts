/**
 * Tests for POST /api/ranking/:id/reingresar.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../[id]/reingresar/route";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server/auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function postRequest(cookie: string): NextRequest {
  return new NextRequest("http://localhost/api/ranking/stu-009/reingresar", {
    method: "POST",
    headers: { cookie },
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

describe("POST /api/ranking/:id/reingresar", () => {
  it("returns 401 when the access-token cookie is missing", async () => {
    const response = await POST(postRequest(""), { params: { id: "stu-009" } });

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("forwards the student id in the URL and the token as Bearer", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ success: true }));

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`), {
      params: { id: "stu-009" },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/ranking/stu-009/reingresar",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer abc123" }),
      }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it("propagates a 404 when the student does not exist", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ message: "Estudiante no encontrado." }, 404),
    );

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`), {
      params: { id: "unknown" },
    });

    expect(response.status).toBe(404);
  });

  it("returns 503 when the backend is unreachable", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError("fetch failed"));

    const response = await POST(postRequest(`${ACCESS_TOKEN_COOKIE}=abc123`), {
      params: { id: "stu-009" },
    });

    expect(response.status).toBe(503);
  });
});
