import type { Metadata } from "next";
import ProductList from "@/components/ProductList";

export const metadata: Metadata = {
  title: "Products",
};

export default function ProductsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Products</h1>
      <ProductList />
    </div>
  );
}
