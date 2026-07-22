/**
 * Shared BFF (Backend-for-Frontend) proxy helpers.
 *
 * Every Route Handler under `src/app/api/**` that proxies to FastAPI repeats
 * the same scaffolding: extract the access-token cookie, build an
 * `AbortController` with a timeout, parse a JSON body, relay non-OK backend
 * errors as user-facing messages, and translate abort/network failures into
 * 504/503. These helpers centralize that boilerplate so each route handler
 * only declares its own request shape and backend path — no duplicated
 * cookie/timeout/error plumbing.
 *
 * ⚠️ Server-only — import only from Route Handlers (`src/app/api/**`).
 */

import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, getBackendApiUrl } from "@/lib/server/auth";

/** Default backend timeout for proxied requests. */
export const BACKEND_TIMEOUT_MS = 10_000;

/**
 * Extract the access-token cookie from the incoming request.
 * Returns `null` when the cookie is absent — callers should reply with a 401.
 */
export function extractAccessToken(request: NextRequest): string | null {
  return request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

/** Build the full backend URL for a given path (e.g. `/ranking/seleccion-oficial`). */
export function backendUrl(path: string): string {
  return `${getBackendApiUrl()}${path}`;
}

/**
 * Convenience: return a 401 `NextResponse` when the access token is missing.
 * Callers do: `const token = extractAccessToken(request); if (!token) return unauthorizedResponse();`
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ message: "No autenticado." }, { status: 401 });
}

/** Return a 400 `NextResponse` with the given message. */
export function badRequestResponse(message: string): NextResponse {
  return NextResponse.json({ message }, { status: 400 });
}

/** Return a 504 `NextResponse` for backend timeout. */
export function timeoutResponse(): NextResponse {
  return NextResponse.json(
    { message: "La solicitud al servidor tardó demasiado." },
    { status: 504 },
  );
}

/** Return a 503 `NextResponse` for network/backend-unreachable failures. */
export function networkErrorResponse(): NextResponse {
  return NextResponse.json(
    { message: "No se pudo contactar al servidor." },
    { status: 503 },
  );
}

/**
 * Parse a JSON body from the request. Returns `[body, null]` on success or
 * `[null, NextResponse]` when the body is not valid JSON — callers should
 * return the error response immediately.
 */
export async function parseJsonBody(
  request: NextRequest,
): Promise<readonly [unknown, null] | readonly [null, NextResponse]> {
  try {
    const body = await request.json();
    return [body, null] as const;
  } catch {
    return [null, badRequestResponse("JSON inválido en el cuerpo de la solicitud.")] as const;
  }
}

/** Safely parse a `Response` body as JSON; returns `null` when the body is empty or not JSON. */
export async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Extract a user-facing message from a parsed backend error body.
 * Falls back to a status-based message when the body has no `message` field.
 */
export function extractBackendErrorMessage(data: unknown, status: number): string {
  if (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).message === "string"
  ) {
    return (data as { message: string }).message;
  }
  return `El servidor respondió con un error (${status}).`;
}

/**
 * Translate a caught error from the proxy `fetch` into the appropriate
 * `NextResponse` (504 for timeout-abort, 503 for network failure).
 */
export function handleProxyError(error: unknown): NextResponse {
  if (error instanceof DOMException && error.name === "AbortError") {
    return timeoutResponse();
  }
  return networkErrorResponse();
}

/**
 * Shared timeout controller. Returns `[controller, done]` where `done()`
 * MUST be called in a `finally` block to clear the timeout.
 */
export function backendTimeout(): readonly [AbortController, () => void] {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
  return [controller, () => clearTimeout(timeoutId)] as const;
}
