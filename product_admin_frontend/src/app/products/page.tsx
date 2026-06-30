import { redirect } from "next/navigation";

/**
 * Products (legacy) — Redirects to the Memberships & Payments page.
 *
 * This route is kept to avoid breaking legacy imports and tests.
 * Inventory is not part of the Cata Club domain.
 */
export default function ProductsPage() {
  redirect("/payments");
}
