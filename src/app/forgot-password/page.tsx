/**
 * Forgot Password Page — "Coming soon" placeholder.
 *
 * Layout follows `design/admin-forgot-password-mockup-v1.html` via the
 * shared AuthShell split-screen. Intentionally does NOT implement a real
 * password-reset flow — no form, no submission, no backend call. This page
 * only communicates status and offers a way back to login.
 */

import Link from "next/link";
import { KeyRound, ArrowLeft } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

export default function ForgotPasswordPage(): React.ReactElement {
  return (
    <AuthShell
      eyebrow="Cata Club Admin"
      title="Recuperar contraseña"
      headline={
        <>
          Perdiste el punto,
          <br />
          no <em className="not-italic text-cata-red-light">el partido</em>.
        </>
      }
      description="Recuperá el acceso a tu cuenta en un par de pasos. La gestión del club no se detiene."
    >
      {/* Status card */}
      <div className="card p-8 text-center sm:p-9">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cata-red/10">
          <KeyRound size={28} className="text-cata-red" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-cata-text">
          Próximamente
        </h2>
        <p className="text-sm leading-relaxed text-cata-text/65">
          La recuperación de contraseña todavía no está disponible. Por
          ahora, contacte al administrador del club si olvidó su
          contraseña.
        </p>
      </div>

      {/* Auth companion link — back to login */}
      <p className="mt-6 text-center text-sm text-cata-text/65">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-medium text-cata-red transition-colors hover:text-cata-red-light"
        >
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          Volver a Iniciar Sesión
        </Link>
      </p>

      {/* Demo mode note */}
      <p className="mt-6 text-center text-xs text-cata-text/30">
        Esta pantalla es un placeholder de demostración. No se envía ni
        almacena ningún dato.
      </p>
    </AuthShell>
  );
}
