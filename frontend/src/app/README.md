# `src/app/` — App Router Pages

Next.js 14 App Router directory. Each subdirectory represents a route segment.

| Route | File | Purpose |
|-------|------|---------|
| `/` | `page.tsx` | Home / landing page |
| `/login` | `login/page.tsx` | Login placeholder |
| `/dashboard` | `dashboard/page.tsx` | Dashboard overview |
| `/payments` | `payments/page.tsx` | Membership payment validation (CU012) |
| `/api/payments` | `api/payments/route.ts` | Mock API handler for payment validation |

### Route Handlers (`src/app/api/`)

Used exclusively for **local development mocks**. In production, the API
client (`src/services/api.ts`) always calls same-origin `/api/*` Route
Handlers (BFF pattern) — never the backend directly from the browser. Those
server-side handlers reach the real backend via `BACKEND_API_URL`
(`src/lib/server/`). `NEXT_PUBLIC_API_URL` is NOT read anywhere under `src/`
at runtime — it only exists as a `Dockerfile` build ARG (see
`frontend/Dockerfile`).

**Do not** add business logic here — these are thin stubs.
