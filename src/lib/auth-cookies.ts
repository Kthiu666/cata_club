/**
 * Auth cookie name constants — the one thing both the server-only BFF
 * helpers (src/lib/server/auth.ts) and the edge middleware (middleware.ts)
 * need to agree on.
 *
 * Deliberately has NO other exports and NO Node-only code (no `Buffer`, no
 * `fetch` to the backend): middleware.ts runs in the Edge runtime and can
 * only safely import trivial, side-effect-free modules. Everything else
 * related to tokens (JWT decoding, cookie options, refresh) stays in
 * src/lib/server/auth.ts, which re-exports these two names so existing
 * imports from "@/lib/server/auth" keep working unchanged.
 */

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
