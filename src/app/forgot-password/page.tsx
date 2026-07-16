/**
 * Forgot Password Page — "Coming soon" placeholder.
 *
 * Matches the centered-card fidelity of login/register (brand header, card
 * container, companion link) but intentionally does NOT implement a real
 * password-reset flow — no form, no submission, no backend call. This page
 * only communicates status and offers a way back to login.
 */

import Image from "next/image";
import Link from "next/link";
import { KeyRound, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[75vh] items-center justify-center py-12">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="mb-10 text-center">
          <div className="relative mx-auto mb-5 h-20 w-20 overflow-hidden rounded-2xl shadow-soft">
            <Image
              src="/brand/cata-club-logo.jpeg"
              alt="Cata Club"
              fill
              className="object-cover"
              sizes="80px"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-cata-text">
            Recuperar Contraseña
          </h1>
          <p className="mt-1.5 text-sm text-cata-text/65">
            Cata Club Admin
          </p>
        </div>

        {/* Status card */}
        <div className="card p-8 text-center sm:p-9">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cata-red/10">
            <KeyRound size={28} className="text-cata-red" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-cata-text">
            Próximamente
          </h2>
          <p className="text-sm leading-relaxed text-cata-text/65">
            La recuperación de contraseña estará disponible cuando el
            servicio de autenticación del backend esté conectado. Por ahora,
            use una de las cuentas de demostración para iniciar sesión.
          </p>
        </div>

        {/* Auth companion link — back to login */}
        <p className="mt-8 text-center text-sm text-cata-text/65">
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
      </div>
    </div>
  );
}
