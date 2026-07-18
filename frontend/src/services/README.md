# `src/services/` — API Client & External Integrations

Centralised layer for all external communication.

| File | Purpose |
|------|---------|
| `api.ts` | HTTP client — every call goes same-origin to a Next.js Route Handler under `/api/*` |

### Rules

- **No UI logic** in services — return plain data, never JSX.
- **No direct `fetch()` calls** outside this directory.
- **Error handling** happens here (wraps fetch, returns typed errors).

### API Path Convention

The client always calls `apiEndpoint(resource)` -> `/api` + resource, same-origin
(e.g. `"/payments"` -> `/api/payments`). There is no cross-origin "direct backend"
mode anymore — the access/refresh tokens live in HttpOnly cookies invisible to
browser JS, so only a server-side Route Handler can attach `Authorization: Bearer`
(see `src/lib/server/backend-client.ts`). Each resource's Route Handler
independently decides whether it still serves mock data or already proxies to
the real FastAPI backend; `NEXT_PUBLIC_USE_MOCKS` only controls the `x-mock-role`
header sent to handlers that are still mock-backed.

### Key Types

- `PaymentValidationRequest` — membership payment proof awaiting admin validation
- `UpdatePaymentValidationDTO` — approve or reject with optional rejection reason
