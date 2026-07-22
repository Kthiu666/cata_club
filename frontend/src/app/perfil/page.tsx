"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Shield, Lock, AlertTriangle, CheckCircle, type LucideIcon } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleLabel } from "@/lib/auth-utils";
import type { UserRole } from "@/types/domain";

const REDIRECT_TO_STUDENT_ROLES: ReadonlySet<UserRole> = new Set(["representante", "estudiante"]);

export default function PerfilPage(): React.ReactElement {
  const { session } = useAuth();
  const router = useRouter();
  const role = session?.user.role ?? null;

  useEffect(() => {
    if (role && !STAFF_ROLES.includes(role)) {
      router.replace("/student");
    }
  }, [role, router]);

  if (!session || !role || !STAFF_ROLES.includes(role)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-cata-text/65">Redirigiendo...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={STAFF_ROLES}>
      <AppShell eyebrow="Mi Cuenta" title="Perfil">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Profile card */}
          <div className="card p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cata-red/15 text-2xl font-bold text-cata-red">
                {session.user.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-cata-text">{session.user.name}</h2>
                <p className="text-sm text-cata-text/60">{getRoleLabel(role)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <InfoRow icon={User} label="Nombre completo" value={session.user.name} />
              <InfoRow icon={Mail} label="Correo electrónico" value={session.user.email} />
              <InfoRow icon={Shield} label="Rol" value={getRoleLabel(role)} />
            </div>
          </div>

          {/* Password change */}
          <PasswordChangeSection email={session.user.email} />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-cata-border bg-cata-bg px-4 py-3">
      <Icon size={16} strokeWidth={1.5} className="shrink-0 text-cata-red" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-cata-text/45">{label}</p>
        <p className="truncate text-sm font-medium text-cata-text">{value}</p>
      </div>
    </div>
  );
}

function PasswordChangeSection({ email }: { email: string }): React.ReactElement {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestRecovery(): Promise<void> {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/auth/recuperar-contrasenia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: email }),
      });
      if (!res.ok) {
        setError("No se pudo enviar el enlace de recuperación. Intente nuevamente.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Lock size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        <h3 className="text-sm font-bold text-cata-text">Cambiar contraseña</h3>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-cata-text/60">
        Se enviará un enlace de recuperación a tu correo electrónico para restablecer la contraseña.
      </p>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-cata-red/30 bg-cata-red/10 px-4 py-3 text-sm text-cata-red" role="alert">
          <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700" role="status">
          <CheckCircle size={14} strokeWidth={2} aria-hidden="true" />
          Enlace enviado. Revise su bandeja de entrada.
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleRequestRecovery()}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? "Enviando..." : "Enviar enlace de recuperación"}
      </button>
    </div>
  );
}
