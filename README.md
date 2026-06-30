# Cata Club Admin

Frontend application for the **Cata Club** table tennis administration system. This repository keeps the application at the Git root so GitHub, CI, package scripts, and contributors all work from one clear entry point.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Repository Layout

```text
.
├── .github/workflows/ci.yml   # CI checks for pushes and pull requests
├── public/                    # Static assets and Cata Club brand files
├── src/
│   ├── app/                   # Next.js App Router pages and local API routes
│   ├── components/            # Reusable UI components
│   ├── controllers/           # Controller-facing documentation/contracts
│   └── services/              # API client, mocks, and service tests
├── package.json               # Scripts, dependencies, and package metadata
├── pnpm-lock.yaml             # Locked dependency graph
└── README.md                  # Project overview and operating guide
```

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS 3
- **Icons:** lucide-react
- **Package Manager:** pnpm
- **Testing:** Vitest
- **Linting:** ESLint (next/core-web-vitals)

## Application Structure

```
src/
├── app/            # Next.js App Router pages and Route Handlers
│   ├── api/        # Local mock Route Handlers for development
│   ├── dashboard/  # Admin dashboard
│   ├── login/      # Login screen
│   ├── payments/   # Membership payment validation (CU012)
│   └── products/   # Product administration screens
├── components/     # Reusable UI components
├── controllers/    # Controller-facing documentation/contracts
└── services/       # API client, local mock store, and service tests
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
