import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, backendLogout, clearAuthCookies } from "@/lib/server/auth";

/**
 * POST /api/auth/logout — best-effort upstream logout, always clears cookies.
 *
 * The backend contract states logout is informational only (it does not
 * revoke tokens server-side), so client-side cookie clearing here is always
 * authoritative — cookies are cleared regardless of whether the upstream
 * call succeeds, throws, or times out.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const accessCookie = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (accessCookie) {
    await backendLogout(accessCookie);
  }

  const response = NextResponse.json({ success: true }, { status: 200 });
  clearAuthCookies(response);
  return response;
}
