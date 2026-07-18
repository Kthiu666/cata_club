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

Used exclusively for **local development mocks**. In production, the API client
(`src/services/api.ts`) redirects to `NEXT_PUBLIC_API_URL`.

**Do not** add business logic here — these are thin stubs.
