/**
 * Legacy /products route — redirects to /payments.
 *
 * Preserves bookmarks and avoids 404s after the payments refactor.
 */

import { redirect } from "next/navigation";

export default function ProductsPage() {
  redirect("/payments");
}
