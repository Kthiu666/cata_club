# `src/components/` — Reusable UI Components

Presentational and container components shared across pages.

| Component | Purpose |
|-----------|---------|
| `Header` | Top navigation bar with links |
| `ProductCard` | Single product display card |
| `ProductList` | Client component that fetches and renders product cards |

### Conventions

- One component per file, named after the file.
- Client components requiring interactivity or effects use `"use client"`.
- Server components (default) are preferred when no state/effects are needed.
- Use `export default function ComponentName()` for page-level components.
- Use `export function ComponentName()` for reusable components.
- TypeScript interfaces defined inline at the top of the file.
