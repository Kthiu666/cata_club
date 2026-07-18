/**
 * Login Page — real backend authentication via the BFF (/api/auth/login).
 *
 * Layout follows `design/admin-login-mockup-v1.html`: a split screen with
 * a dark marketing panel (AuthShell) on the left and the form on the
 * right.
 *
 * Note: the "Acceso rápido (Demo)" chips below still reference the old
 * demo-persona credentials. Those accounts don't exist on the real FastAPI
 * backend, so clicking them will now surface a genuine "invalid_credentials"
 * error — left as-is since removing/replacing that UI is a product decision
 * outside this change's scope (Phase 2-4: BFF + real auth wiring).
 *
 * The mockup's fifth chip, "Natural (Pre-inscripción)", has no matching
 * login credential or UserRole in `src/types/domain.ts` — it reads as a
 * shortcut into the public enrollment flow for a person who hasn't
 * registered yet, not a login. It's wired to `/student/enroll` (already
 * public, see PUBLIC_EXCEPTIONS in `src/lib/middleware-utils.ts`) instead
 * of inventing a fifth demo account.
 */

"use client";

import { type FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultRoute } from "@/lib/auth-utils";
import type { AuthErrorKind } from "@/services/auth";
import AuthShell from "@/components/auth/AuthShell";

/** Distinct, user-readable message per login failure kind. */
function loginErrorMessage(error: AuthErrorKind): string {
  switch (error) {
    case "invalid_credentials":
      return "Credenciales inválidas. Verifique su correo y contraseña.";
    case "session_validation_failed":
      return "No se pudo validar la sesión luego de iniciar sesión. Intente nuevamente.";
    case "timeout":
      return "La solicitud tardó demasiado en responder. Verifique su conexión e intente nuevamente.";
    case "backend_unavailable":
      return "No se pudo conectar con el servidor. Intente nuevamente en unos minutos.";
    case "unknown":
    default:
      return "Ocurrió un error inesperado al iniciar sesión. Intente nuevamente.";
  }
}

// NOT real credentials: these are inert, publicly-known placeholder
// strings (e.g. "admin123") for the "Acceso rápido (demo)" shortcut
// buttons rendered below. They don't correspond to any account on the
// real FastAPI backend — clicking one calls the same `login()` used by
// the manual form and surfaces a genuine "invalid_credentials" error
// (see the file header). There is no secret here to leak; they exist
// only as UI copy for a not-yet-removed demo affordance (out of scope
// for this visual migration — see file header).
//
// Demo-role chip colors are constrained to the declared `cata-*` brand
// namespace only. The namespace has 3 genuinely distinct hues (red,
// state-ok green, navy); roles are differentiated by bold label text +
// dot color rather than an off-palette hue.
interface DemoLoginShortcut {
  email: string;
  placeholderPassword: string;
  label: string;
  dot: string;
}

const demoAccounts: DemoLoginShortcut[] = [
  { email: "admin@cataclub.com", placeholderPassword: "admin123", label: "Administrador", dot: "bg-cata-red" },
  { email: "entrenador@cataclub.com", placeholderPassword: "trainer123", label: "Entrenador", dot: "bg-cata-state-ok" },
  { email: "representante@cataclub.com", placeholderPassword: "rep123", label: "Representante", dot: "bg-cata-navy" },
  { email: "estudiante@cataclub.com", placeholderPassword: "self123", label: "Autogestionado", dot: "bg-cata-red-light" },
];

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to role-appropriate page if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && session) {
      router.replace(getDefaultRoute(session.user.role));
    }
  }, [isLoading, isAuthenticated, session, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await login(email, password);

    if (!result.ok) {
      setError(loginErrorMessage(result.error));
      setSubmitting(false);
      return;
    }

    router.replace(getDefaultRoute(result.session.user.role));
  }

  async function handleDemoLogin(email: string, password: string): Promise<void> {
    setError(null);
    const result = await login(email, password);
    if (result.ok) {
      router.replace(getDefaultRoute(result.session.user.role));
      return;
    }
    setError(loginErrorMessage(result.error));
  }

  // Show loading during session hydration
  if (isLoading) {
    return (
      <div className="auth-shell flex min-h-screen items-center justify-center">
        <p className="text-sm text-cata-text/65">Cargando sesión...</p>
      </div>
    );
  }

  return (
    <AuthShell
      eyebrow="Panel de gestión"
      title="Bienvenido de nuevo"
      subtitle="Inicie sesión para continuar"
      headline={
        <>
          Cada punto
          <br />
          cuenta. <em className="not-italic text-cata-red-light">Llevalo</em>
          <br />
          bien anotado.
        </>
      }
      description="Estudiantes, pagos, asistencia y grupos del club, todo en un solo lugar — sin planillas sueltas."
      showBackToSite
    >
      {/* Demo quick login */}
      <div className="mb-6">
        <p className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-cata-text/50">
          Acceso rápido (demo)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {demoAccounts.map((acc): React.ReactElement => (
            <button
              key={acc.email}
              type="button"
              onClick={(): void => {
                void handleDemoLogin(acc.email, acc.placeholderPassword);
              }}
              className="flex items-center gap-2 rounded-[11px] border border-cata-border bg-cata-surface px-2.5 py-2.5 text-left text-xs font-semibold text-cata-text transition-all hover:-translate-y-px hover:shadow-soft"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${acc.dot}`} aria-hidden="true" />
              {acc.label}
            </button>
          ))}
          <Link
            href="/student/enroll"
            className="col-span-2 flex items-center gap-2 rounded-[11px] border border-cata-border bg-cata-surface px-2.5 py-2.5 text-left text-xs font-semibold text-cata-text transition-all hover:-translate-y-px hover:shadow-soft"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-cata-gray-light" aria-hidden="true" />
            Natural (Pre-inscripción)
          </Link>
        </div>
      </div>

      <div className="mb-6 h-px bg-cata-border" />

      {/* Form card */}
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-cata-text">
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
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
              disabled={submitting}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-cata-text">
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
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              required
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

        {/* Error message */}
        {error && (
          <div className="alert-error" role="alert">
            <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-cata-text/65 transition-colors hover:text-cata-red"
          >
            ¿Olvidó su contraseña?
          </Link>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full shadow-soft">
          {submitting ? "Iniciando sesión..." : "Iniciar Sesión"}
        </button>
      </form>

      {/* Auth companion links */}
      <p className="mt-6 text-center text-sm text-cata-text/65">
        ¿No tiene una cuenta?{" "}
        <Link href="/register" className="font-medium text-cata-red transition-colors hover:text-cata-red-light">
          Crear una
        </Link>
      </p>

      {/* Auth note */}
      <p className="mt-6 text-center text-xs text-cata-text/30">
        La autenticación se verifica contra el servidor. Su sesión se mantiene
        mediante una cookie segura — el navegador nunca almacena su contraseña
        ni su token de acceso.
      </p>
    </AuthShell>
  );
}
