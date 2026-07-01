"use client";

import { type FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    // Auth is in demo mode — form submission is a UI placeholder.
    // Wire to the backend auth endpoint when the service is available.
    setTimeout(() => {
      setSubmitting(false);
      setDemoSuccess(true);
    }, 1500);
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center py-12">
      <div className="w-full max-w-sm">
        {/* Brand header — real logo centered */}
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
          <h1 className="text-2xl font-bold tracking-tight text-cata-charcoal">
            Bienvenido de nuevo
          </h1>
          <p className="mt-1.5 text-sm text-cata-gray">
            {demoSuccess
              ? "Modo demo — aún no hay autenticación"
              : "Inicie sesión en Cata Club Admin"}
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
                Demo — Autenticación Inactiva
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-cata-gray">
                No se verificaron las credenciales. Esto es una demostración de IU — el
                inicio de sesión se habilitará cuando el servicio de autenticación del backend esté conectado.
              </p>
              <button
                onClick={() => setDemoSuccess(false)}
                className="btn-primary"
              >
                Intentar de nuevo
              </button>
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

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    strokeWidth={1.5}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                    aria-hidden="true"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Ingrese su contraseña"
                    required
                    disabled={submitting}
                    className="input-field pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cata-gray hover:text-cata-charcoal"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={1.5} aria-hidden="true" />
                    ) : (
                      <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-cata-gray transition-colors hover:text-cata-red"
                >
                  ¿Olvidó su contraseña?
                </Link>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full shadow-soft"
              >
                {submitting ? "Iniciando sesión..." : "Iniciar Sesión"}
              </button>
            </form>
          )}
        </div>

        {/* Auth companion links */}
        <p className="mt-8 text-center text-sm text-cata-gray">
          ¿No tiene una cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-cata-red transition-colors hover:text-cata-red-light"
          >
            Crear una
          </Link>
        </p>

        {/* Nota de modo demo */}
        <p className="mt-6 text-center text-xs text-cata-gray/40">
          La interfaz de autenticación es un placeholder de demostración. El envío del
          formulario estará inactivo hasta que el servicio de autenticación del backend esté conectado.
        </p>
      </div>
    </div>
  );
}
