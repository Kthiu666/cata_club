# `src/controllers/` — Placeholder (Future Orchestration Layer)

> **Status: PLACEHOLDER** — This directory is reserved for page-level
> orchestration logic that doesn't belong inside a component or a service.
> Currently unused. No controllers exist yet.

When page files (e.g. `src/app/products/page.tsx`) grow complex, extract
orchestration here:

| Concern | Where it goes |
|---------|---------------|
| API calls, data fetching | `src/services/` |
| UI state, rendering | `src/components/` or `src/app/` pages |
| Page-level orchestration, formatters, transformers | `src/controllers/` |
| Business logic shared across pages | `src/controllers/` |

### Convention (when implemented)

File name matches the page it serves, e.g. `productsController.ts` for the
products page.

### Future Example

```ts
// controllers/productsController.ts
import { fetchProducts } from "@/services/api";
import type { Product } from "@/services/api";

export async function getProductList(): Promise<Product[]> {
  const products = await fetchProducts();
  return products.filter((p) => p.stock > 0);
}
```
