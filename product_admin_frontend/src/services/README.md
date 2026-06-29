# `src/services/` — API Client & External Integrations

Centralised layer for all external communication.

| File | Purpose |
|------|---------|
| `api.ts` | HTTP client with mock/real backend switching |

### Rules

- **No UI logic** in services — return plain data, never JSX.
- **No direct `fetch()` calls** outside this directory.
- **Mock switching** is transparent: consumers call the same function
  regardless of `NEXT_PUBLIC_USE_MOCKS`.
- **Error handling** happens here (wraps fetch, returns typed errors).
