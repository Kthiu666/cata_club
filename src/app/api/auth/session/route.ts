import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  backendMe,
  backendRefresh,
  buildSession,
  clearAuthCookies,
  isNearExpiry,
  setAuthCookies,
} from "@/lib/server/auth";

/** Refresh proactively once the access token has under 5 minutes left — well inside its 60-minute lifetime. */
const PROACTIVE_REFRESH_THRESHOLD_SECONDS = 5 * 60;

/**
 * GET /api/auth/session — hydrate the browser's auth state.
 *
 * Always re-derives the session from /auth/me (roles can change server-side)
 * rather than trusting a stale local claim. If the access token is missing
 * or close to expiry, attempts a refresh first; if refresh also fails,
 * clears cookies and reports unauthenticated. A transient backend outage
 * (unrelated to the token itself) returns 503 without clearing cookies, so
 * a network blip doesn't silently log the user out.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const accessCookie = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshCookie = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessCookie && !refreshCookie) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let activeAccessToken = accessCookie;
  let refreshedAccessToken: string | undefined;

  const needsProactiveRefresh =
    activeAccessToken !== undefined && isNearExpiry(activeAccessToken, PROACTIVE_REFRESH_THRESHOLD_SECONDS);

  if ((!activeAccessToken || needsProactiveRefresh) && refreshCookie) {
    const refreshResult = await backendRefresh(refreshCookie);
    if (refreshResult.ok) {
      refreshedAccessToken = refreshResult.data.access_token;
      activeAccessToken = refreshedAccessToken;
    } else if (!activeAccessToken) {
      // No access token at all and the refresh attempt failed too.
      if (refreshResult.error.code === "backend_unavailable" || refreshResult.error.code === "timeout") {
        return NextResponse.json({ authenticated: false, error: refreshResult.error.code }, { status: 503 });
      }
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }
    // else: proactive refresh failed but we still have a (soon-to-expire)
    // access token — fall through and try it; the retry path below clears
    // the session if /auth/me also rejects it.
  }

  if (!activeAccessToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let meResult = await backendMe(activeAccessToken);

  if (!meResult.ok && meResult.error.code === "unauthorized" && refreshCookie && !refreshedAccessToken) {
    const refreshResult = await backendRefresh(refreshCookie);
    if (refreshResult.ok) {
      refreshedAccessToken = refreshResult.data.access_token;
      meResult = await backendMe(refreshedAccessToken);
    }
  }

  if (!meResult.ok) {
    if (meResult.error.code === "backend_unavailable" || meResult.error.code === "timeout") {
      return NextResponse.json({ authenticated: false, error: meResult.error.code }, { status: 503 });
    }
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const session = buildSession(meResult.data);
  const response = NextResponse.json(session, { status: 200 });
  if (refreshedAccessToken) {
    setAuthCookies(response, { accessToken: refreshedAccessToken });
  }
  return response;
}
