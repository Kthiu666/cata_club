"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    // Password recovery is a demo placeholder.
    // Wire to the backend auth reset endpoint when the service is available.
    setTimeout(() => {
      setSubmitting(false);
      setDemoSuccess(true);
    }, 1500);
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center py-12">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="mb-10 text-center">
          <div className="relative mx-auto mb-5 h-24 w-24 overflow-hidden rounded-2xl shadow-elevated">
            <Image
              src="/brand/cata-club-logo.jpeg"
              alt="Cata Club"
              fill
              className="object-cover"
              sizes="96px"
              priority
            />
          </div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-cata-red/80">
            Cata Club — Tenis de Mesa
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-cata-charcoal">
            Recuperar Contraseña
          </h1>
          <p className="mt-1.5 text-sm text-cata-gray">
            {demoSuccess
              ? "Revise su bandeja de entrada (en producción)"
              : "Ingrese su correo electrónico y le enviaremos las instrucciones de recuperación."}
          </p>
        </div>

        {/* Form card */}
        <div className="card p-8 sm:p-9">
          {demoSuccess ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle
                  size={28}
                  className="text-green-600"
                  aria-hidden="true"
                />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-cata-charcoal">
                Demo — No se Envió Correo
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-cata-gray">
                Esto es una demostración de IU. No se envió ningún correo de recuperación. En
                producción, se enviarían instrucciones a la dirección de correo proporcionada.
              </p>
              <Link href="/login" className="btn-primary inline-block">
                Volver a Iniciar Sesión
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    strokeWidth={1.5}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                    aria-hidden="true"
                  />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="correo@ejemplo.com"
                    required
                    disabled={submitting}
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full shadow-soft"
              >
                {submitting ? "Enviando..." : "Enviar Correo de Recuperación"}
              </button>
            </form>
          )}
        </div>

        {/* Back to login */}
        <p className="mt-8 text-center text-sm text-cata-gray">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 font-medium text-cata-red transition-colors hover:text-cata-red-light"
          >
            <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
            Volver a Iniciar Sesión
          </Link>
        </p>

        {/* Demo mode note */}
        <p className="mt-6 text-center text-xs text-cata-gray/40">
          La recuperación de contraseña es un placeholder de demostración. No se envía ningún
          correo. Este flujo se conectará al servicio de autenticación del backend cuando esté disponible.
        </p>
      </div>
    </div>
  );
}
