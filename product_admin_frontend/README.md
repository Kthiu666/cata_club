# Cata Club Admin Frontend

Frontend application for the **Cata Club** table tennis (Tenis de Mesa) club administration system. Developed by **Pair 3** for the university software engineering project.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS 3
- **Icons:** lucide-react
- **Package Manager:** pnpm
- **Testing:** Vitest
- **Linting:** ESLint (next/core-web-vitals)

## Architecture Overview

```
src/
├── app/            # Next.js App Router pages and API routes
│   ├── api/        # Local mock Route Handlers (dev only)
│   │   └── payments/
│   ├── login/
│   ├── dashboard/
│   └── payments/   # Membership payment validation (CU012)
├── components/     # Reusable UI components
└── services/       # API client, external service integrations
```

## Domain Overview

Cata Club manages:

| Area | Description |
|------|-------------|
| **Access & Users** | Login/logout, user accounts, student and legal representative registration, credential generation |
| **Memberships & Payments** | Membership types, proof of payment upload (image/PDF), admin validation (CU012), physical payment recording; membership states: pending payment, pending validation, active, expired |
| **Operation & Attendance** | Training schedule management, student assignment by technical level, attendance states: present, absent, late, justified |
| **Consultation** | Students/representatives consult schedule and membership state; admin consults attendance by schedule, period, or student |

## API-First Workflow

This frontend is **decoupled from the backend** via an API contract. The strategy:

1. **Develop UI using local mocks** — Route Handlers under `src/app/api/` return realistic data.
2. **Set `NEXT_PUBLIC_USE_MOCKS=false`** when the Python backend is ready.
3. **Configure `NEXT_PUBLIC_API_URL`** to point to the real backend.
4. The API client (`src/services/api.ts`) automatically switches between mocks and real API.

### API Contracts

#### Memberships & Payments (CU012 — Payment Validation)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments` | GET | List all membership payment validation requests |
| `/api/payments/:id` | PUT | Approve or reject a payment validation request |

**Approve request body:**
```json
{ "action": "approved" }
```

**Reject request body:**
```json
{ "action": "rejected", "rejectionReason": "Reason for rejection" }
```

## Getting Started

```bash
pnpm install    # installs all dependencies
pnpm dev        # starts the dev server
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm test` | Run tests (Vitest) |
| `pnpm test:watch` | Run tests in watch mode |
