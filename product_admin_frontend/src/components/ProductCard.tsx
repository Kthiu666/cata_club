/**
 * ProductCard — Single product display card
 */

import type { Product } from "@/services/api";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(product.price);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="mb-1 text-lg font-semibold text-slate-800">
        {product.name}
      </h3>

      {product.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          className="mb-3 h-40 w-full rounded object-cover"
        />
      )}

      <p className="mb-2 text-sm text-slate-600">{product.description}</p>

      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-slate-900">{formattedPrice}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            product.stock > 0
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
        </span>
      </div>

      <div className="mt-2 text-xs text-slate-400">{product.category}</div>
    </div>
  );
}
