/**
 * /profile — role-differentiated account screen (issue #36).
 *
 * ADMINISTRADOR/ENTRENADOR (frontend roles "admin"/"trainer" — "tesorero"
 * falls through to this same view too, but it's a dead backend role no
 * real account can carry anymore, see design decision) see their own
 * identity data fetched via `fetchMiPerfil()` (`GET /api/auth/me`).
 * Nombres, apellidos, and roles are read-only; correo and teléfono can be
 * edited inline and are persisted via `actualizarMiPerfil()`
 * (`PATCH /api/auth/me`). A "Cambiar contraseña" action reuses the
 * existing unauthenticated recovery-email flow (`solicitarRecuperacion`)
 * against the user's own known correo — there is no new authenticated
 * password-change endpoint.
 *
 * ALUMNO / representante-linked accounts (frontend roles "estudiante" /
 * "representante") have no staff profile to show here — instead they see
 * `StudentSummaryView`, a read-only summary (name, ranking, membership
 * status) for themselves (`self`) and each dependent (`representados`),
 * sourced from the same `fetchStudentPortal` data `/student` already uses.
 * A "Ver portal completo" link goes to `/student` for full detail
 * (attendance history, membership plans catalog, etc.) — this view is a
 * summary, not a duplicate.
 *
 * Previously (issue #35): a same-for-all-roles "under construction"
 * placeholder. Previously (issue #36, first pass): estudiante/representante
 * were redirected client-side to `/student` instead of seeing anything here.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMiPerfil,
  actualizarMiPerfil,
  solicitarRecuperacion,
  fetchStudentPortal,
  ApiClientError,
} from "@/services/api";
import type { StudentPortalSummary, StudentProfileSummary, StudentMembershipSummary } from "@/services/api";
import type { PerfilPropio, UserRole } from "@/types/domain";
import { describeRanking } from "@/app/student/student-utils";
import { MEMBERSHIP_STATUS_LABELS, MEMBERSHIP_STATUS_BADGE } from "@/app/members/members-utils";
// Reused as-is (not duplicated) for consistency — this is the same
// backend-estado -> frontend-estado mapping `members-adapter.ts` reuses;
// it's a pure value object with no server-only APIs, safe in a client bundle.
import { MEMBERSHIP_STATUS_BY_ESTADO } from "@/lib/membership-status";
import {
  User,
  Loader2,
  Pencil,
  Save,
  X,
  KeyRound,
  CheckCircle2,
  Mail,
  Phone,
  Shield,
  Calendar,
  Trophy,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { formatDate } from "@/lib/format-utils";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Roles with no staff profile here — see `StudentSummaryView` instead. */
const STUDENT_SUMMARY_ROLES: ReadonlySet<UserRole> = new Set(["representante", "estudiante"]);

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
// Staff profile view (admin / trainer)
// ---------------------------------------------------------------------------

interface StaffProfileViewProps {
  perfil: PerfilPropio;
  accountEmail: string;
  onSaved: (perfil: PerfilPropio) => void;
}

function StaffProfileView({ perfil, accountEmail, onSaved }: StaffProfileViewProps): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [correo, setCorreo] = useState(perfil.correo);
  const [telefono, setTelefono] = useState(perfil.telefono);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [requestingPassword, setRequestingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function startEditing(): void {
    setCorreo(perfil.correo);
    setTelefono(perfil.telefono);
    setSaveError(null);
    setSaveSuccess(false);
    setEditing(true);
  }

  function cancelEditing(): void {
    setCorreo(perfil.correo);
    setTelefono(perfil.telefono);
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
      // Revert to display mode showing the last known-good values — a
      // rejected edit must never be left displayed as if it were
      // persisted (no silent data loss, per spec).
      setCorreo(perfil.correo);
      setTelefono(perfil.telefono);
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
    <div className="mx-auto w-full max-w-xl py-10">
      <div className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cata-red/10">
            <User size={26} className="text-cata-red" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-cata-text">{fullName}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {perfil.roles.map((rol) => (
                <span key={rol} className="badge badge-neutral">
                  <Shield size={11} strokeWidth={1.5} aria-hidden="true" />
                  {rol}
                </span>
              ))}
            </div>
          </div>
        </div>

        <dl className="space-y-4">
          <div>
            <dt>
              <label
                htmlFor="perfil-correo"
                className="mb-1 flex items-center gap-1.5 text-xs font-medium text-cata-text/65"
              >
                <Mail size={13} strokeWidth={1.5} aria-hidden="true" />
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
              <label
                htmlFor="perfil-telefono"
                className="mb-1 flex items-center gap-1.5 text-xs font-medium text-cata-text/65"
              >
                <Phone size={13} strokeWidth={1.5} aria-hidden="true" />
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
          <div>
            <dt className="mb-1 flex items-center gap-1.5 text-xs font-medium text-cata-text/65">
              <Calendar size={13} strokeWidth={1.5} aria-hidden="true" />
              Miembro desde
            </dt>
            <dd className="text-sm text-cata-text">{formatDate(perfil.fechaCreacion)}</dd>
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
                {saving ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Save size={14} strokeWidth={1.5} aria-hidden="true" />
                )}
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
            <button
              type="button"
              onClick={startEditing}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
              Editar
            </button>
          )}
        </div>

        {saveError && (
          <p role="alert" className="mt-3 text-sm text-cata-red">
            {saveError}
          </p>
        )}
        {saveSuccess && (
          <p role="status" className="mt-3 flex items-center gap-1 text-sm text-cata-state-ok">
            <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
            Datos guardados correctamente.
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
          {passwordMessage && (
            <p role="status" className="mt-2 text-sm text-cata-state-ok">
              {passwordMessage}
            </p>
          )}
          {passwordError && (
            <p role="alert" className="mt-2 text-sm text-cata-red">
              {passwordError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Student/representante summary view — read-only, same data source as
// /student (fetchStudentPortal), but a summary card per managed profile
// instead of the full portal (attendance, membership plans catalog, etc.).
// ---------------------------------------------------------------------------

/** Membership display for a persona, looked up by id in the caller-scoped `memberships` list — reuses the same mapping/labels as members-utils.ts / payments-adapter.ts (no invented labels). Returns `null` when no membership row exists for that persona — this is the normal case for a representado (the backend never exposes a dependent's membership), rendered as an honest "no disponible" fallback, not a false "sin membresía" claim. */
function describeMembership(
  memberships: StudentMembershipSummary[],
  personaId: string,
): { label: string; badgeClass: string } | null {
  const match = memberships.find((membership) => String(membership.personaId) === personaId);
  if (!match) return null;
  const estado = MEMBERSHIP_STATUS_BY_ESTADO[match.estado as keyof typeof MEMBERSHIP_STATUS_BY_ESTADO];
  return { label: MEMBERSHIP_STATUS_LABELS[estado], badgeClass: MEMBERSHIP_STATUS_BADGE[estado] };
}

interface StudentSummaryCardProps {
  profile: StudentProfileSummary;
  memberships: StudentMembershipSummary[];
}

function StudentSummaryCard({ profile, memberships }: StudentSummaryCardProps): React.ReactElement {
  const ranking = describeRanking(profile.ranking);
  const membership = describeMembership(memberships, profile.personaId);
  const fullName = `${profile.nombres} ${profile.apellidos}`.trim();

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cata-red/10">
          <User size={20} className="text-cata-red" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h2 className="text-base font-bold tracking-tight text-cata-text">{fullName}</h2>
      </div>

      <dl className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-cata-text/65">
            <Trophy size={13} strokeWidth={1.5} aria-hidden="true" />
            Ranking
          </dt>
          <dd className="text-sm font-medium text-cata-text">{ranking.label}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-cata-text/65">
            <ShieldCheck size={13} strokeWidth={1.5} aria-hidden="true" />
            Membresía
          </dt>
          <dd>
            {membership ? (
              <span className={`badge ${membership.badgeClass}`}>{membership.label}</span>
            ) : (
              <span className="text-sm text-cata-text/65">No disponible — consulte con administración</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

type StudentSummaryLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: StudentPortalSummary };

function StudentSummaryView(): React.ReactElement {
  const { session } = useAuth();
  const personaId = session?.user.id ?? "";

  const [state, setState] = useState<StudentSummaryLoadState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!personaId) return;
    let cancelled = false;
    setState({ status: "loading" });
    fetchStudentPortal(personaId)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: toErrorMessage(error, "No se pudo cargar su cuenta."),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [personaId, reloadToken]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-cata-text/65">Cargando su cuenta...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <AlertTriangle size={28} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        <p role="alert" className="text-sm text-cata-red">
          {state.message}
        </p>
        <button
          type="button"
          onClick={() => setReloadToken((n) => n + 1)}
          className="btn-ghost text-xs"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { data } = state;
  const profiles: StudentProfileSummary[] = data.self ? [data.self, ...data.representados] : data.representados;

  return (
    <div className="mx-auto w-full max-w-2xl py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-cata-text">Mi cuenta</h1>
        <Link href="/student" className="btn-ghost inline-flex items-center gap-2 text-sm">
          Ver portal completo
          <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </div>

      {profiles.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-cata-text/50">No se encontraron estudiantes asociados a esta cuenta.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {profiles.map((profile) => (
            <StudentSummaryCard
              key={profile.personaId}
              profile={profile}
              // The backend only ever scopes /membresias/mias to the JWT
              // owner's own persona — never a represented dependent's. Pass
              // the real array only for `self`; representados always get []
              // so the card renders the honest "no disponible" fallback
              // instead of falsely reporting "sin membresía registrada" for
              // a dependent who may well have one on file. Mirrors
              // /student/page.tsx's identical MembershipCard usage.
              memberships={profile.personaId === data.self?.personaId ? data.memberships : []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content — role branch
// ---------------------------------------------------------------------------

function ProfileContent(): React.ReactElement | null {
  const { session } = useAuth();
  const role = session?.user.role ?? null;
  const isStudentSummaryRole = role !== null && STUDENT_SUMMARY_ROLES.has(role);

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (isStudentSummaryRole) return;
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
  }, [isStudentSummaryRole, reloadToken]);

  if (isStudentSummaryRole) return <StudentSummaryView />;

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
        <p role="alert" className="text-sm text-cata-red">
          {state.message}
        </p>
        <button
          type="button"
          onClick={() => setReloadToken((n) => n + 1)}
          className="btn-ghost text-xs"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <StaffProfileView
      perfil={state.perfil}
      accountEmail={state.perfil.correo ?? session?.user.email}
      onSaved={(perfil) => setState({ status: "ready", perfil })}
    />
  );
}

export default function ProfilePage(): React.ReactElement {
  return (
    <ProtectedRoute
      allowedRoles={["admin", "trainer", "tesorero", "representante", "estudiante"]}
    >
      <ProfileContent />
    </ProtectedRoute>
  );
}
