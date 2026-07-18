/**
 * Authenticated backend proxy — the shared primitive every protected
 * resource's Route Handler (payments, asistencias, personas, ranking, ...)
 * uses to call FastAPI with a valid `Authorization: Bearer` header.
 *
 * Mirrors the token-resolution and refresh-and-retry dance already
 * established in `src/app/api/auth/session/route.ts`, factored out so it
 * isn't reimplemented per resource. Like the rest of `src/lib/server/**`,
 * this is server-only — import it only from Route Handlers.
 */

import type { NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  backendFetch,
  backendRefresh,
  isNearExpiry,
  type AuthErrorCode,
} from "@/lib/server/auth";

/** Same threshold used by /api/auth/session — refresh proactively with 5 minutes left. */
const PROACTIVE_REFRESH_THRESHOLD_SECONDS = 5 * 60;

interface ResolvedToken {
  token: string;
  /** Set when this resolution itself refreshed the token — skips a redundant retry-refresh below. */
  refreshedAccessToken?: string;
}

/** Resolve a usable access token from cookies, refreshing first if missing or near expiry. Null when unrecoverable. */
async function resolveAccessToken(request: NextRequest): Promise<ResolvedToken | null> {
  const accessCookie = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshCookie = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessCookie && !refreshCookie) return null;

  const needsRefresh = accessCookie !== undefined && isNearExpiry(accessCookie, PROACTIVE_REFRESH_THRESHOLD_SECONDS);

  if ((!accessCookie || needsRefresh) && refreshCookie) {
    const refreshResult = await backendRefresh(refreshCookie);
    if (refreshResult.ok) {
      return { token: refreshResult.data.access_token, refreshedAccessToken: refreshResult.data.access_token };
    }
    if (!accessCookie) return null;
    // Proactive refresh failed but the current token might still be valid for a bit longer — try it as-is.
  }

  return accessCookie ? { token: accessCookie } : null;
}

export type BackendProxyResult =
  | { ok: true; response: Response; refreshedAccessToken?: string }
  | { ok: false; status: number; error: AuthErrorCode };

const STATUS_BY_ERROR: Record<AuthErrorCode, number> = {
  invalid_credentials: 401,
  backend_unavailable: 503,
  timeout: 503,
  invalid_response: 502,
  unauthorized: 401,
  unknown: 500,
};

/**
 * Authenticated proxy fetch to FastAPI. Reads the access-token cookie off
 * `request` (refreshing it first if missing/near expiry), attaches
 * `Authorization: Bearer`, and — if the backend still answers 401 with an
 * unrefreshed token — refreshes once more and retries exactly once (mirrors
 * the retry in `/api/auth/session`). Returns the raw `Response` so callers
 * decide how to shape their own `NextResponse` (passthrough JSON, or
 * translate the DTO into a frontend-specific shape).
 *
 * Callers that receive `refreshedAccessToken` MUST call `setAuthCookies`
 * (from `src/lib/server/auth.ts`) on their own `NextResponse` before
 * returning, or the refreshed token is silently dropped on this request.
 */
export async function backendFetchAuthed(
  request: NextRequest,
  path: string,
  init: RequestInit = {},
): Promise<BackendProxyResult> {
  const resolved = await resolveAccessToken(request);
  if (!resolved) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const attempt = (token: string) =>
    backendFetch(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });

  let result = await attempt(resolved.token);
  let refreshedAccessToken = resolved.refreshedAccessToken;

  if (result.ok && result.data.status === 401 && !refreshedAccessToken) {
    const refreshCookie = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    if (refreshCookie) {
      const refreshResult = await backendRefresh(refreshCookie);
      if (refreshResult.ok) {
        refreshedAccessToken = refreshResult.data.access_token;
        result = await attempt(refreshedAccessToken);
      }
    }
  }

  if (!result.ok) {
    return { ok: false, status: STATUS_BY_ERROR[result.error.code], error: result.error.code };
  }

  return { ok: true, response: result.data, refreshedAccessToken };
}
