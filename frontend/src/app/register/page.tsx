/**
 * Register Page — demo placeholder (no backend account creation yet).
 *
 * Layout follows `design/admin-register-mockup-v1.html`: split screen via
 * AuthShell, with the existing field set/validation/demo-success flow
 * unchanged.
 */

"use client";

import { useState, type FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getDefaultRoute } from "@/lib/auth-utils";
import AuthShell from "@/components/auth/AuthShell";
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
  const toast = useToast();

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
  const [demoSuccess, setDemoSuccess] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);
    const passwordEntry = formData.get("password");
    const confirmPasswordEntry = formData.get("confirmPassword");
    // Both fields are plain <input type="password">, never <input type="file">,
    // so FormData.get() always returns a string here — narrow defensively
    // instead of asserting, since FormDataEntryValue is `string | File | null`.
    const password = typeof passwordEntry === "string" ? passwordEntry : "";
    const confirmPassword = typeof confirmPasswordEntry === "string" ? confirmPasswordEntry : "";

    if (password !== confirmPassword) {
      toast.showError("Las contraseñas no coinciden.");
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

  if (isLoading) {
    return (
      <div className="auth-shell flex min-h-screen items-center justify-center">
        <p className="text-sm text-cata-text/65">Cargando sesión...</p>
      </div>
    );
  }

  return (
    <AuthShell
      eyebrow="Cata Club — Tenis de Mesa"
      title="Crear su cuenta"
      subtitle="Regístrese en el sistema administrativo"
      headline={
        <>
          Sumate a la
          <br />
          mesa. <em className="not-italic text-cata-red-light">Empezá</em>
          <br />
          a jugar en serio.
        </>
      }
      description="Creá tu cuenta para gestionar estudiantes, pagos y asistencia del club desde un solo lugar."
      showBackToSite
    >
      {demoSuccess ? (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cata-state-ok/10">
            <CheckCircle size={28} className="text-cata-state-ok" aria-hidden="true" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-cata-text">
            Registro de Demostración Completado
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-cata-text/65">
            No se almacenó ningún dato. Esto es una demostración de IU — cuando el
            backend esté conectado, se crearía su cuenta. Para continuar el
            recorrido, puede pasar directamente a la inscripción.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleContinueToEnrollment}
              disabled={navigating}
              className="btn-primary w-full justify-center"
            >
              {navigating ? "Redirigiendo..." : "Inscribirse"}
              {!navigating && <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={(): void => {
                setDemoSuccess(false);
              }}
              className="btn-secondary w-full justify-center"
            >
              Editar información
            </button>
            <Link href="/login" className="btn-ghost justify-center text-center">
              Ir a Iniciar Sesión
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-4 text-center text-xs text-cata-text/45">
            <span className="text-cata-red" aria-hidden="true">*</span> Campos obligatorios
          </p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* -- Account -- */}
            <fieldset>
              <legend className="mb-3 text-[11px] font-bold uppercase tracking-widest text-cata-text/45">
                Cuenta
              </legend>

              <div className="mb-4">
                <div className="mb-1.5 flex items-baseline gap-1">
                  <label htmlFor="email" className="text-sm font-medium text-cata-text">
                    Correo electrónico
                  </label>
                  <span className="text-cata-red" aria-hidden="true">*</span>
                </div>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-baseline gap-1">
                    <label htmlFor="password" className="text-sm font-medium text-cata-text">
                      Contraseña
                    </label>
                    <span className="text-cata-red" aria-hidden="true">*</span>
                  </div>
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
                      onClick={(): void => setShowPassword(!showPassword)}
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

                <div>
                  <div className="mb-1.5 flex items-baseline gap-1">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-cata-text">
                      Confirmar Contraseña
                    </label>
                    <span className="text-cata-red" aria-hidden="true">*</span>
                  </div>
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
                      placeholder="Repita la contraseña"
                      required
                      disabled={submitting}
                      className="input-field pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={(): void => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cata-text/65 hover:text-cata-text"
                      aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} strokeWidth={1.5} aria-hidden="true" />
                      ) : (
                        <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </fieldset>

            <hr className="border-cata-border" />

            {/* -- Personal Information -- */}
            <fieldset>
              <legend className="mb-3 text-[11px] font-bold uppercase tracking-widest text-cata-text/45">
                Información personal
              </legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-baseline gap-1">
                    <label htmlFor="firstName" className="text-sm font-medium text-cata-text">
                      Nombres
                    </label>
                    <span className="text-cata-red" aria-hidden="true">*</span>
                  </div>
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

                <div>
                  <div className="mb-1.5 flex items-baseline gap-1">
                    <label htmlFor="lastName" className="text-sm font-medium text-cata-text">
                      Apellidos
                    </label>
                    <span className="text-cata-red" aria-hidden="true">*</span>
                  </div>
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
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-baseline gap-1">
                    <label htmlFor="nationalId" className="text-sm font-medium text-cata-text">
                      Cédula de Identidad
                    </label>
                    <span className="text-cata-red" aria-hidden="true">*</span>
                  </div>
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

                <div>
                  <div className="mb-1.5 flex items-baseline gap-1">
                    <label htmlFor="birthDate" className="text-sm font-medium text-cata-text">
                      Fecha de Nacimiento
                    </label>
                    <span className="text-cata-red" aria-hidden="true">*</span>
                  </div>
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
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-baseline gap-1">
                    <label htmlFor="phone" className="text-sm font-medium text-cata-text">
                      Teléfono Celular
                    </label>
                    <span className="text-cata-red" aria-hidden="true">*</span>
                  </div>
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

                <div>
                  <div className="mb-1.5 flex items-baseline gap-1">
                    <label htmlFor="contactPhone" className="text-sm font-medium text-cata-text">
                      Teléfono de Contacto
                    </label>
                    <span className="text-cata-text/45">(opcional)</span>
                  </div>
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
              </div>
            </fieldset>

            {/* Note: Club context (technical level, health/medical info) is intentionally
                absent from registration. Those details are captured during the student
                enrollment flow — see /student/enroll. */}

            <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full shadow-soft">
              {submitting ? "Creando cuenta..." : "Crear Cuenta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-cata-text/65">
            ¿Ya tiene una cuenta?{" "}
            <Link href="/login" className="font-medium text-cata-red transition-colors hover:text-cata-red-light">
              Iniciar sesión
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-cata-text/30">
            La interfaz de registro es un placeholder de demostración. No se envía ni almacena
            ningún dato. La creación de cuentas se habilitará cuando el servicio de autenticación
            del backend esté conectado.
          </p>
        </>
      )}
    </AuthShell>
  );
}
