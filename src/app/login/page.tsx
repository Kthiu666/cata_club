/**
 * Login Page — Mock authentication with demo personas.
 *
 * Accepts one of the predefined demo credentials and creates a client-side
 * session. Redirects to the role-appropriate page on success.
 *
 * ⚠️ Demo only — no real authentication. Credentials are hardcoded and
 * visible in source. This is NOT secure and must be replaced with a real
 * backend auth flow for production.
 */

"use client";

import { type FormEvent, useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, AlertCircle, ShieldCheck, GraduationCap, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultRoute } from "@/lib/auth-utils";

// Demo-role chip colors are constrained to the declared `cata-*` brand
// namespace only (fix B1). The namespace has 3 genuinely distinct hues
// (red, state-ok green, navy); 2 of the 4 roles reuse a red shade
// differentiated by bold label text + a unique icon rather than an
// off-palette hue.
const demoAccounts = [
  { email: "admin@cataclub.com", password: "admin123", role: "admin" as const, label: "Administrador", icon: ShieldCheck, color: "bg-cata-red/10 text-cata-red border-cata-red/20" },
  { email: "entrenador@cataclub.com", password: "trainer123", role: "trainer" as const, label: "Entrenador", icon: GraduationCap, color: "bg-cata-state-ok/10 text-cata-state-ok border-cata-state-ok/20" },
  { email: "representante@cataclub.com", password: "rep123", role: "representante" as const, label: "Representante", icon: UserCircle, color: "bg-cata-navy/8 text-cata-navy border-cata-navy/20" },
  { email: "autogestionado@cataclub.com", password: "self123", role: "estudiante" as const, label: "Autogestionado", icon: UserCircle, color: "bg-cata-red-light/10 text-cata-red-light border-cata-red-light/25" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Redirect to role-appropriate page if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && session) {
      router.replace(getDefaultRoute(session.user.role));
    }
  }, [isLoading, isAuthenticated, session, router]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Small delay to simulate network latency and show the submitting state
    timeoutRef.current = setTimeout(() => {
      const result = login(email, password);

      if (!result) {
        setError(
          "Credenciales inválidas. Verifique su correo y contraseña, o use una cuenta de demostración.",
        );
        setSubmitting(false);
        return;
      }

      // Redirect to the role-appropriate page
      const route = getDefaultRoute(result.user.role);
      router.replace(route);
    }, 800);
  }

  function handleDemoLogin(email: string, password: string) {
    setError(null);
    const result = login(email, password);
    if (result) {
      const route = getDefaultRoute(result.user.role);
      router.replace(route);
    }
  }

  // Show loading during session hydration
  if (isLoading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center">
        <p className="text-sm text-cata-text/65">Cargando sesión...</p>
      </div>
    );
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
          <h1 className="text-2xl font-bold tracking-tight text-cata-text">
            Bienvenido de nuevo
          </h1>
          <p className="mt-1.5 text-sm text-cata-text/65">
            Inicie sesión en Cata Club Admin
          </p>
        </div>

        {/* Demo quick login */}
        <div className="mb-6">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-cata-text/45">
            Acceso rápido (Demo)
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => handleDemoLogin(acc.email, acc.password)}
                className={`flex items-center gap-2 rounded-xl border p-3 text-center transition-all hover:shadow-soft ${acc.color}`}
              >
                <acc.icon size={18} strokeWidth={1.5} aria-hidden="true" />
                <span className="text-xs font-semibold">{acc.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mb-6 h-px bg-cata-border" />

        {/* Form card */}
        <div className="card p-8 sm:p-9">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  required
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

            {/* Error message */}
            {error && (
              <div className="alert-error" role="alert">
                <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-cata-text/65 transition-colors hover:text-cata-red"
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
        </div>

        {/* Auth companion links */}
        <p className="mt-6 text-center text-sm text-cata-text/65">
          ¿No tiene una cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-cata-red transition-colors hover:text-cata-red-light"
          >
            Crear una
          </Link>
        </p>

        {/* Demo mode note */}
        <p className="mt-6 text-center text-xs text-cata-text/30">
          La autenticación funciona con cuentas de demostración predeterminadas.
          Los datos de sesión se almacenan localmente en el navegador.
          No ingrese credenciales reales.
        </p>
      </div>
    </div>
  );
}
