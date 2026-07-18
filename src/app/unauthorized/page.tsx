/**
 * /unauthorized — Explicit landing page for the "unsupported role" state.
 *
 * Reached by an AUTHENTICATED user whose backend `roles` (ADMINISTRADOR,
 * ENTRENADOR, TESORERO, ALUMNO) are empty or entirely unrecognized — see
 * `mapBackendRoleToUserRole` in src/lib/server/auth.ts, which maps that case
 * to the `"unsupported"` UserRole instead of silently falling back to a real
 * role (or to "representante", which is an unrelated, non-authenticated
 * concept).
 *
 * Gated the same way every other role-restricted page is gated — via
 * ProtectedRoute with allowedRoles={["unsupported"]} — rather than a
 * special case. That single, central mechanism (canAccess + getDefaultRoute
 * in src/lib/auth-utils.ts) is what prevents both directions of the
 * failure mode this page exists for:
 *   - An "unsupported" user hitting any real protected page gets redirected
 *     here by ProtectedRoute (getDefaultRoute("unsupported") === "/unauthorized").
 *   - A user with a real role who navigates here directly gets redirected
 *     to THEIR default route instead of seeing this page pointlessly.
 *   - An unauthenticated visitor gets sent to /login, same as any other
 *     protected page — no loop, since this page terminates the redirect
 *     chain for the one role it allows.
 */

"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, LogOut } from "lucide-react";

function UnauthorizedContent(): React.ReactElement {
  const { session, logout } = useAuth();

  return (
    <div className="flex min-h-[75vh] items-center justify-center py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cata-red/10">
          <ShieldAlert size={30} className="text-cata-red" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-cata-text">
          Cuenta sin rol asignado
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-cata-text/65">
          Su cuenta{session?.user.name ? ` (${session.user.name})` : ""} no
          tiene un rol reconocido por el sistema. Contacte a un administrador
          del club para que le asigne un rol (Administrador, Entrenador,
          Tesorero o Alumno).
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-cata-red px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cata-red-light"
        >
          <LogOut size={15} strokeWidth={1.5} aria-hidden="true" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export default function UnauthorizedPage(): React.ReactElement {
  return (
    <ProtectedRoute allowedRoles={["unsupported"]}>
      <UnauthorizedContent />
    </ProtectedRoute>
  );
}
