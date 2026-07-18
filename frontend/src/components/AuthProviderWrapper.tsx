/**
 * AuthProviderWrapper — Client boundary for AuthContext.
 *
 * The root layout.tsx is a Server Component (for metadata), so the
 * client-only AuthProvider must be wrapped in its own "use client"
 * boundary and then imported into the layout.
 */

"use client";

import { AuthProvider } from "@/contexts/AuthContext";

export default function AuthProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
