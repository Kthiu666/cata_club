/**
 * Route Handler Tests — GET /api/dashboard
 *
 * The dashboard proxies to the backend's single aggregate endpoint
 * GET /dashboard/stats, which returns all four metrics in one call.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server/auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function base64Url(input: string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeJwt(): string {
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ sub: "1", exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `${header}.${payload}.sig`;
}

function getRequest(): NextRequest {
  return new NextRequest("http://localhost/api/dashboard", {
    headers: { cookie: `${ACCESS_TOKEN_COOKIE}=${makeJwt()}` },
  });
}

describe("GET /api/dashboard", () => {
  beforeEach(() => {
    vi.spyOn(global, "fetch");
    process.env.BACKEND_API_URL = "http://localhost:8000/api/v1";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BACKEND_API_URL;
  });

  it("proxies to the single /dashboard/stats endpoint", async () => {
    const stats = { totalPersonas: 12, activeMemberships: 7, pendingPayments: 3, todaySchedules: 5 };
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(stats));

    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(stats);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain("/dashboard/stats");
  });

  it("propagates the backend's status when /dashboard/stats fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ detail: "Service unavailable" }, 503));

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.message).toBe("Service unavailable");
  });
});
