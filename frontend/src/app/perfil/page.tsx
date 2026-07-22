"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMiPerfil,
  actualizarMiPerfil,
  solicitarRecuperacion,
  ApiClientError,
} from "@/services/api";
import type { PerfilPropio, UserRole } from "@/types/domain";
import { User, Loader2, Pencil, Save, X, KeyRound, CheckCircle2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// 1. Aquí aplicamos tu refactor de la constante
const STAFF_ROLES: UserRole[] = ["admin", "trainer", "representante"];

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; perfil: PerfilPropio };

// ---------------------------------------------------------------------------
// Staff profile view (admin / trainer / representante)
// ---------------------------------------------------------------------------

interface StaffProfileViewProps {
  perfil: PerfilPropio;
  accountEmail: string;
  onSaved: (perfil: PerfilPropio) => void;
}

function StaffProfileView({ perfil, accountEmail, onSaved }: StaffProfileViewProps): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [correo, setCorreo] = useState(perfil.correo ?? "");
  const [telefono, setTelefono] = useState(perfil.telefono ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [requestingPassword, setRequestingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function startEditing(): void {
    setCorreo(perfil.correo ?? "");
    setTelefono(perfil.telefono ?? "");
    setSaveError(null);
    setSaveSuccess(false);
    setEditing(true);
  }

  function cancelEditing(): void {
    setCorreo(perfil.correo ?? "");
    setTelefono(perfil.telefono ?? "");
    setSaveError(null);
    setEditing(false);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await actualizarMiPerfil({
        correo: correo.trim(),
        telefono: telefono.trim(),
      });
      onSaved(updated);
      setEditing(false);
      setSaveSuccess(true);
    } catch (error: unknown) {
      setCorreo(perfil.correo ?? "");
      setTelefono(perfil.telefono ?? "");
      setEditing(false);
      setSaveError(toErrorMessage(error, "No se pudo guardar los cambios."));
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(): Promise<void> {
    setRequestingPassword(true);
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      const result = await solicitarRecuperacion(accountEmail);
      setPasswordMessage(result.mensaje);
    } catch (error: unknown) {
      setPasswordError(toErrorMessage(error, "No se pudo enviar el correo de recuperación."));
    } finally {
      setRequestingPassword(false);
    }
  }

  const fullName = `${perfil.nombres} ${perfil.apellidos}`.trim();

  return (
    <div className="mx-auto w-full max-w-xl py-4">
      <div className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cata-red/10">
            <User size={26} className="text-cata-red" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-cata-text">{fullName}</h1>
            <p className="text-sm text-cata-text/65">{perfil.roles.join(", ")}</p>
          </div>
        </div>

        <dl className="space-y-4">
          <div>
            <dt>
              <label htmlFor="perfil-correo" className="mb-1 block text-xs font-medium text-cata-text/65">
                Correo electrónico
              </label>
            </dt>
            {editing ? (
              <input
                id="perfil-correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                disabled={saving}
                className="input-field w-full"
              />
            ) : (
              <dd className="text-sm text-cata-text">{perfil.correo}</dd>
            )}
          </div>
          <div>
            <dt>
              <label htmlFor="perfil-telefono" className="mb-1 block text-xs font-medium text-cata-text/65">
                Teléfono
              </label>
            </dt>
            {editing ? (
              <input
                id="perfil-telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                disabled={saving}
                className="input-field w-full"
              />
            ) : (
              <dd className="text-sm text-cata-text">{perfil.telefono}</dd>
            )}
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} strokeWidth={1.5} aria-hidden="true" />}
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="btn-ghost inline-flex items-center gap-2 disabled:opacity-50"
              >
                <X size={14} strokeWidth={1.5} aria-hidden="true" />
                Cancelar
              </button>
            </>
          ) : (
            <button type="button" onClick={startEditing} className="btn-ghost inline-flex items-center gap-2">
              <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
              Editar
            </button>
          )}
        </div>

        {saveError && <p role="alert" className="mt-3 text-sm text-cata-red">{saveError}</p>}
        {saveSuccess && (
          <p role="status" className="mt-3 flex items-center gap-1 text-sm text-cata-state-ok">
            <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" /> Datos guardados correctamente.
          </p>
        )}

        <div className="mt-6 border-t border-cata-border pt-5">
          <button
            type="button"
            onClick={() => void handleChangePassword()}
            disabled={requestingPassword}
            className="btn-ghost inline-flex items-center gap-2 disabled:opacity-50"
          >
            <KeyRound size={14} strokeWidth={1.5} aria-hidden="true" />
            {requestingPassword ? "Enviando..." : "Cambiar contraseña"}
          </button>
          {passwordMessage && <p role="status" className="mt-2 text-sm text-cata-state-ok">{passwordMessage}</p>}
          {passwordError && <p role="alert" className="mt-2 text-sm text-cata-red">{passwordError}</p>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content — role branch
// ---------------------------------------------------------------------------

function ProfileContent(): React.ReactElement | null {
  const { session } = useAuth();
  const router = useRouter();
  const role = session?.user.role ?? null;
  
  // 2. Aquí está la corrección de tu useEffect conectada a STAFF_ROLES
  const shouldRedirectToStudent = role !== null && !STAFF_ROLES.includes(role);

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (shouldRedirectToStudent) {
      router.replace("/student");
    }
  }, [shouldRedirectToStudent, router]);

  useEffect(() => {
    if (shouldRedirectToStudent) return;
    let cancelled = false;
    setState({ status: "loading" });
    fetchMiPerfil()
      .then((perfil) => {
        if (!cancelled) setState({ status: "ready", perfil });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: toErrorMessage(error, "No se pudo cargar su perfil."),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [shouldRedirectToStudent, reloadToken]);

  if (shouldRedirectToStudent) return null;

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-cata-text/65">Cargando perfil...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p role="alert" className="text-sm text-cata-red">{state.message}</p>
        <button type="button" onClick={() => setReloadToken((n) => n + 1)} className="btn-ghost text-xs">
          Reintentar
        </button>
      </div>
    );
  }

  // 3. ¡Y aquí envolvemos la vista de la API dentro de tu diseño AppShell!
  return (
    <AppShell eyebrow="Mi Cuenta" title="Perfil">
      <StaffProfileView
        perfil={state.perfil}
        accountEmail={state.perfil.correo ?? session?.user.email ?? ""}
        onSaved={(perfil) => setState({ status: "ready", perfil })}
      />
    </AppShell>
  );
}

export default function ProfilePage(): React.ReactElement {
  return (
    // Ya eliminé TESORERO de aquí según tu migración en backend.
    <ProtectedRoute allowedRoles={["admin", "trainer", "representante", "estudiante"]}>
      <ProfileContent />
    </ProtectedRoute>
  );
}