"use client";

import { useState, type FormEvent, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultRoute } from "@/lib/auth-utils";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  Hash,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export default function RegisterPage(): React.ReactElement {
  const router = useRouter();
  const { isAuthenticated, isLoading, session } = useAuth();

  // Redirect to role-appropriate page if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && session) {
      router.replace(getDefaultRoute(session.user.role));
    }
  }, [isLoading, isAuthenticated, session, router]);
  const [submitting, setSubmitting] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [demoSuccess, setDemoSuccess] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setFormError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    // Demo mode: simulate processing then show success state
    setTimeout(() => {
      setSubmitting(false);
      setDemoSuccess(true);
    }, 1500);
  }

  function handleContinueToEnrollment(): void {
    // Guard: prevent double-click / repeated activation while navigating.
    if (navigating) return;

    // /student/enroll is a public, unauthenticated flow (see
    // PUBLIC_EXCEPTIONS in src/lib/middleware-utils.ts) — it must not
    // depend on a real login. It previously logged in with a hardcoded demo
    // account, which broke this button against the real backend.
    setNavigating(true);
    router.push("/student/enroll");
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
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
          <h1 className="text-2xl font-bold tracking-tight text-cata-text">
            Crear su cuenta
          </h1>
          <p className="mt-1.5 text-sm text-cata-text/65">
            Regístrese en el sistema administrativo
          </p>
        </div>

        {/* Form card */}
        <div className="card p-8 sm:p-9">
          {demoSuccess ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cata-state-ok/10">
                <CheckCircle
                  size={28}
                  className="text-cata-state-ok"
                  aria-hidden="true"
                />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-cata-text">
                Registro de Demostración Completado
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-cata-text/65">
                No se almacenó ningún dato. Esto es una demostración de IU — cuando el
                backend esté conectado, se crearía su cuenta. Para continuar el
                recorrido, puede pasar directamente a la inscripción.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleContinueToEnrollment}
                  disabled={navigating}
                  className="btn-primary"
                >
                  {navigating ? "Redirigiendo..." : "Inscribirse"}
                  {!navigating && <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />}
                </button>
                <button
                  onClick={() => {
                    setDemoSuccess(false);
                    setFormError(null);
                  }}
                  className="btn-secondary"
                >
                  Editar información
                </button>
                <Link href="/login" className="btn-ghost text-center">
                  Ir a Iniciar Sesión
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* -- Account -- */}
              <fieldset>
                <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-cata-text/45">
                  Cuenta
                </legend>

                {/* Email */}
                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-cata-text"
                  >
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
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

                {/* Password */}
                <div className="mb-4">
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-cata-text"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
                      aria-hidden="true"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Cree una contraseña"
                      required
                      minLength={8}
                      disabled={submitting}
                      className="input-field pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cata-text/65 hover:text-cata-text"
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

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1.5 block text-sm font-medium text-cata-text"
                  >
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
                      aria-hidden="true"
                    />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder="Vuelva a ingresar la contraseña"
                      required
                      disabled={submitting}
                      className="input-field pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cata-text/65 hover:text-cata-text"
                      aria-label={
                        showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} strokeWidth={1.5} aria-hidden="true" />
                      ) : (
                        <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </fieldset>

              {/* -- Personal Information -- */}
              <hr className="border-cata-border" />
              <fieldset>
                <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-cata-text/45">
                  Información Personal
                </legend>

                {/* First Names */}
                <div className="mb-4">
                  <label
                    htmlFor="firstName"
                    className="mb-1.5 block text-sm font-medium text-cata-text"
                  >
                    Nombres
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      placeholder="p. ej. Juan Carlos"
                      required
                      disabled={submitting}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Last Names */}
                <div className="mb-4">
                  <label
                    htmlFor="lastName"
                    className="mb-1.5 block text-sm font-medium text-cata-text"
                  >
                    Apellidos
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      placeholder="p. ej. Rodríguez López"
                      required
                      disabled={submitting}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* National ID */}
                <div className="mb-4">
                  <label
                    htmlFor="nationalId"
                    className="mb-1.5 block text-sm font-medium text-cata-text"
                  >
                    Cédula de Identidad
                  </label>
                  <div className="relative">
                    <Hash
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      id="nationalId"
                      name="nationalId"
                      placeholder="p. ej. 1712345678"
                      required
                      disabled={submitting}
                      pattern="[0-9]{10}"
                      maxLength={10}
                      inputMode="numeric"
                      title="Cédula ecuatoriana: 10 dígitos (p. ej. 1712345678)"
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Birth Date */}
                <div className="mb-4">
                  <label
                    htmlFor="birthDate"
                    className="mb-1.5 block text-sm font-medium text-cata-text"
                  >
                    Fecha de Nacimiento
                  </label>
                  <div className="relative">
                    <Calendar
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
                      aria-hidden="true"
                    />
                    <input
                      type="date"
                      id="birthDate"
                      name="birthDate"
                      required
                      disabled={submitting}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="mb-4">
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-sm font-medium text-cata-text"
                  >
                    Teléfono Celular
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
                      aria-hidden="true"
                    />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      placeholder="p. ej. 0991234567"
                      required
                      disabled={submitting}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div>
                  <label
                    htmlFor="contactPhone"
                    className="mb-1.5 block text-sm font-medium text-cata-text"
                  >
                    Teléfono de Contacto{" "}
                    <span className="text-cata-text/45">(opcional)</span>
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
                      aria-hidden="true"
                    />
                    <input
                      type="tel"
                      id="contactPhone"
                      name="contactPhone"
                      placeholder="p. ej. 022345678"
                      disabled={submitting}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Note: Club context (technical level, health/medical info) is intentionally
                  absent from registration. Those details are captured during the student
                  enrollment flow — see /student/enroll. */}

              {/* Validation error */}
              {formError && (
                <div className="alert-error" role="alert">
                  {formError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary mt-2 w-full shadow-soft"
              >
                {submitting ? "Creando cuenta..." : "Crear Cuenta"}
              </button>
            </form>
          )}
        </div>

        {/* Sign in link */}
        <p className="mt-8 text-center text-sm text-cata-text/65">
          ¿Ya tiene una cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-cata-red transition-colors hover:text-cata-red-light"
          >
            Iniciar sesión
          </Link>
        </p>

        {/* Demo mode note */}
        <p className="mt-6 text-center text-xs text-cata-text/30">
          La interfaz de registro es un placeholder de demostración. No se envía ni almacena
          ningún dato. La creación de cuentas se habilitará cuando el servicio de autenticación
          del backend esté conectado.
        </p>
      </div>
    </div>
  );
}
