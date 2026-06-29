# Product Admin Frontend

Frontend application for the product administration system. Developed by **Pair 3** for the university software engineering project.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS 3
- **Package Manager:** pnpm
- **Linting:** ESLint (next/core-web-vitals)
- **Deployment:** Not yet configured — `next build` produces a static export or Node server bundle

## Architecture Overview

```
src/
├── app/            # Next.js App Router pages and API routes
│   ├── api/        # Local mock Route Handlers (dev only)
│   ├── login/
│   ├── dashboard/
│   └── products/
├── components/     # Reusable UI components
├── controllers/    # Page-level orchestration (placeholder — not yet in use)
└── services/       # API client, external service integrations
```

## API-First Workflow

This frontend is **decoupled from the backend** via an API contract. The strategy:

1. **Develop UI using local mocks** — Route Handlers under `src/app/api/` return realistic data.
2. **Set `NEXT_PUBLIC_USE_MOCKS=false`** when the Python backend is ready.
3. **Configure `NEXT_PUBLIC_API_URL`** to point to the real backend.
4. The API client (`src/services/api.ts`) automatically switches between mocks and real API.

### Products API Contract (Agreed)

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|-------------|----------|
| `/api/products` | GET | List all products | — | `Product[]` |
| `/api/products/:id` | GET | Get product by ID | — | `Product` |
| `/api/products` | POST | Create product | `CreateProductDTO` | `Product` |
| `/api/products/:id` | PUT | Update product | `UpdateProductDTO` | `Product` |
| `/api/products/:id` | DELETE | Delete product | — | `{ message: string }` |

### Product Type

```ts
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}
```

## Getting Started

```bash
pnpm install    # installs all dependencies including Tailwind CSS
pnpm dev        # starts the dev server (Tailwind generates styles on the fly)
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

## Cloudinary Configuration

Product images use Cloudinary unsigned uploads. Configure in `.env.local`:

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=product_admin_unsigned
```

> The cloud name is public-safe. The upload preset must be set to **unsigned** in your Cloudinary dashboard. No secrets are committed.
