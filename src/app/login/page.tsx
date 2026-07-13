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
import { Eye, EyeOff, Lock, Mail, AlertCircle, ShieldCheck, GraduationCap, UserCircle, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultRoute } from "@/lib/auth-utils";

const demoAccounts = [
  { email: "admin@cataclub.com", password: "admin123", role: "admin" as const, label: "Administrador", icon: ShieldCheck, color: "bg-cata-red/15 text-cata-red" },
  { email: "entrenador@cataclub.com", password: "trainer123", role: "trainer" as const, label: "Entrenador", icon: GraduationCap, color: "bg-blue-900/20 text-blue-400" },
  { email: "representante@cataclub.com", password: "rep123", role: "responsable_pago" as const, label: "Representante", icon: UserCircle, color: "bg-emerald-900/20 text-emerald-400" },
  { email: "autogestionado@cataclub.com", password: "self123", role: "responsable_pago" as const, label: "Autogestionado", icon: UserCircle, color: "bg-amber-900/20 text-amber-400" },
  { email: "natural@cataclub.com", password: "natural123", role: "responsable_pago" as const, label: "Natural (Pre-inscripción)", icon: UserPlus, color: "bg-violet-900/20 text-violet-400" },
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
        <p className="text-sm text-white/65">Cargando sesión...</p>
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
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Bienvenido de nuevo
          </h1>
          <p className="mt-1.5 text-sm text-white/65">
            Inicie sesión en Cata Club Admin
          </p>
        </div>

        {/* Demo quick login */}
        <div className="mb-6">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-white/45">
            Acceso rápido (Demo)
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => handleDemoLogin(acc.email, acc.password)}
                className={`flex items-center gap-2 rounded-xl border border-white/5 p-3 text-center transition-all hover:shadow-soft hover:border-white/10 ${acc.color}`}
              >
                <acc.icon size={18} strokeWidth={1.5} aria-hidden="true" />
                <span className="text-xs font-semibold">{acc.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-white/40">
            Clic en cualquier botón para iniciar sesión automáticamente con datos de demo.
          </p>
        </div>

        {/* Divider */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/45">o use credenciales</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Form card */}
        <div className="card p-8 sm:p-9">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-white"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  strokeWidth={1.5}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/65"
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
                className="mb-1.5 block text-sm font-medium text-white"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  strokeWidth={1.5}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/65"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/65 hover:text-white"
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
              <div
                className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-cata-red"
                role="alert"
              >
                <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-white/65 transition-colors hover:text-cata-red"
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

        {/* Demo credentials hint */}
        <div className="mt-6 rounded-xl border border-white/8 bg-cata-dark-elevated p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white">
            Acceso de Demostración
          </p>
          <ul className="space-y-1.5 text-xs text-white/65">
            <li className="flex justify-between">
              <span>Administrador</span>
              <span className="font-mono text-white">admin@cataclub.com / admin123</span>
            </li>
            <li className="flex justify-between">
              <span>Entrenador</span>
              <span className="font-mono text-white">entrenador@cataclub.com / trainer123</span>
            </li>
            <li className="flex justify-between">
              <span>Responsable de pago (representante)</span>
              <span className="font-mono text-white">representante@cataclub.com / rep123</span>
            </li>
            <li className="flex justify-between">
              <span>Alumno autogestionado (inscrito)</span>
              <span className="font-mono text-white">autogestionado@cataclub.com / self123</span>
            </li>
            <li className="flex justify-between">
              <span>Pre‑inscripción</span>
              <span className="font-mono text-white">natural@cataclub.com / natural123</span>
            </li>
          </ul>
          <p className="mt-2 text-[10px] leading-relaxed text-white/40">
            <strong>Autogestionado</strong> representa a un alumno ya inscrito que gestiona su propia membresía, pagos y sesiones desde el portal.
            La nueva cuenta <strong>Pre‑inscripción</strong> permite probar el flujo de registro antes de estar inscrito.
          </p>
        </div>

        {/* Auth companion links */}
        <p className="mt-6 text-center text-sm text-white/65">
          ¿No tiene una cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-cata-red transition-colors hover:text-cata-red-light"
          >
            Crear una
          </Link>
        </p>

        {/* Demo mode note */}
        <p className="mt-6 text-center text-xs text-white/30">
          La autenticación funciona con cuentas de demostración predeterminadas.
          Los datos de sesión se almacenan localmente en el navegador.
          No ingrese credenciales reales.
        </p>
      </div>
    </div>
  );
}
