/**
 * Tests for POST /api/auth/logout.
 *
 * Core requirement: cookies are ALWAYS cleared, even when the upstream
 * FastAPI logout call throws/errors/times out — client-side cookie
 * clearing is authoritative per the backend contract (logout is
 * informational only server-side).
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../logout/route";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/server/auth";

function logoutRequest(cookie: string): NextRequest {
  return new NextRequest("http://localhost/api/auth/logout", { method: "POST", headers: { cookie } });
}

beforeEach(() => {
  vi.spyOn(global, "fetch");
  process.env.BACKEND_API_URL = "http://localhost:8000/api/v1";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BACKEND_API_URL;
});

describe("POST /api/auth/logout", () => {
  it("clears both cookies and returns success when the upstream call succeeds", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));

    const response = await POST(logoutRequest(`${ACCESS_TOKEN_COOKIE}=some-access-token`));
    const json = await response.json();

    expect(json).toEqual({ success: true });
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe("");
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.maxAge).toBe(0);
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe("");
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.maxAge).toBe(0);
  });

  it("still clears both cookies and returns success when the upstream call throws", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError("network down"));

    const response = await POST(logoutRequest(`${ACCESS_TOKEN_COOKIE}=some-access-token`));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe("");
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe("");
  });

  it("still clears both cookies and returns success when the upstream call rejects (e.g. 500)", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));

    const response = await POST(logoutRequest(`${ACCESS_TOKEN_COOKIE}=some-access-token`));

    expect(response.status).toBe(200);
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe("");
  });

  it("clears cookies and does not call the backend when there is no access-token cookie", async () => {
    const response = await POST(logoutRequest(""));
    const json = await response.json();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(json).toEqual({ success: true });
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe("");
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe("");
  });
});
