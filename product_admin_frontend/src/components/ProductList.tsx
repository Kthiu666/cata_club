/**
 * ProductList — Client component that fetches products through the API client.
 *
 * Handles loading, error, and empty states. Uses fetchProducts() from
 * src/services/api.ts, which transparently switches between local mock
 * Route Handlers and the real backend based on NEXT_PUBLIC_USE_MOCKS.
 */

"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/services/api";
import { fetchProducts } from "@/services/api";
import ProductCard from "@/components/ProductCard";

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProducts();
        if (!cancelled) {
          setProducts(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load products",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-400">Loading products…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 rounded bg-red-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-400">No products found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {products.length} product{products.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-slate-400">
        Data source:{" "}
        <code className="rounded bg-slate-100 px-1">
          src/services/api.ts
        </code>{" "}
        — set{" "}
        <code className="rounded bg-slate-100 px-1">
          NEXT_PUBLIC_USE_MOCKS=false
        </code>{" "}
        to connect the real backend.
      </p>
    </div>
  );
}
