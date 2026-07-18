# `src/services/` — API Client & External Integrations

Centralised layer for all external communication.

| File | Purpose |
|------|---------|
| `api.ts` | HTTP client with mock/real backend switching |
| `mockStore.ts` | In-memory mock data store for local development |

### Rules

- **No UI logic** in services — return plain data, never JSX.
- **No direct `fetch()` calls** outside this directory.
- **Mock switching** is transparent: consumers call the same function
  regardless of `NEXT_PUBLIC_USE_MOCKS`.
- **Error handling** happens here (wraps fetch, returns typed errors).

### API Path Convention

The client uses `apiEndpoint(resource)` to resolve paths based on mode:

| Mode | `NEXT_PUBLIC_USE_MOCKS` | Prefix | Example full URL |
|------|-------------------------|--------|------------------|
| Mock Route Handlers | unset or not `"false"` | `/api` + resource | `/api/payments` (Next.js local handler) |
| Real backend | `"false"` | `NEXT_PUBLIC_API_URL` + resource | `http://localhost:8000/api/v1/payments` |

Resource paths are always written without the `/api` prefix in source
(e.g. `"/payments"`). The helper prepends `/api` only in mock mode.

> **Default behavior:** when `.env.local` is missing or `NEXT_PUBLIC_USE_MOCKS` is not set, the client defaults to local mock Route Handlers. This keeps `pnpm dev` immediately functional for new contributors without configuration.

### Key Types

- `PaymentValidationRequest` — membership payment proof awaiting admin validation
- `UpdatePaymentValidationDTO` — approve or reject with optional rejection reason
