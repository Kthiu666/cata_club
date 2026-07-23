/**
 * LoginSuccessOverlay — full-screen centered confirmation shown right after
 * a successful login, replacing the previous top-right toast for this one
 * event (a corner toast is too easy to miss on the moment that matters
 * most). Purely presentational; LoginPage owns the redirect timer that
 * keeps this mounted long enough to be read.
 */

"use client";

import { CheckCircle2 } from "lucide-react";

export interface LoginSuccessOverlayProps {
  /** First name (or full name) to personalize the welcome line. */
  name?: string;
}

export default function LoginSuccessOverlay({
  name,
}: LoginSuccessOverlayProps): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[70] flex items-center justify-center px-4"
    >
      <div className="flex flex-col items-center gap-2 rounded-xl bg-cata-state-ok px-10 py-8 text-center shadow-elevated">
        <CheckCircle2 className="h-10 w-10 text-white" aria-hidden="true" />
        <p className="text-lg font-bold text-white">Inicio de sesión exitoso</p>
        <p className="text-base font-semibold text-white">
          {name ? `¡Bienvenido, ${name}!!` : "¡Bienvenido!!"}
        </p>
      </div>
    </div>
  );
}
