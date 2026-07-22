/**
 * /profile — unified "Mi cuenta" account screen (issue #36, redesign).
 *
 * ONE shared page layout (header, hero card, 3-column grid, bottom banner)
 * whose CONTENT swaps by role — not two separate top-level views. All data
 * still comes from the same sources as before:
 *
 * - ADMINISTRADOR/ENTRENADOR ("tesorero" falls through to this same branch
 *   too — it's a dead backend role no real account can carry anymore, see
 *   prior design decision) fetch their own identity via `fetchMiPerfil()`
 *   (`GET /api/auth/me`). Nombres, apellidos, and roles are read-only;
 *   correo/teléfono are edited inline (`actualizarMiPerfil()`, `PATCH
 *   /api/auth/me`) from the "Información personal" column. "Cambiar
 *   contraseña" (in "Estado de cuenta") reuses the existing unauthenticated
 *   recovery-email flow against the user's own known correo.
 *
 * - ALUMNO / representante-linked accounts fetch `fetchStudentPortal()` —
 *   the same data `/student` uses. The hero card summarizes the caller's
 *   own (`self`) ranking + membership; any managed dependents
 *   (`representados`) get their own read-only summary cards below the grid
 *   (ranking + membership, with the honest "no disponible" fallback for
 *   membership since the backend never scopes a dependent's membership to
 *   the caller — only the caller's own `/membresias/mias` row is real).
 *
 * History: issue #35 was a same-for-all-roles "under construction"
 * placeholder. Issue #36 first pass redirected estudiante/representante to
 * `/student`; a follow-up replaced that redirect with a read-only summary
 * view; this pass unifies the staff and student views into one shared page
 * structure per the updated visual design.
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
import { getRoleLabel, getNavLinksForRole } from "@/lib/auth-utils";
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
  ChevronRight,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { formatDate } from "@/lib/format-utils";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Roles with no staff profile here — they see the student-branch content in the unified layout instead. */
const STUDENT_SUMMARY_ROLES: ReadonlySet<UserRole> = new Set(["representante", "estudiante"]);

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/** Membership display for a persona, looked up by id in the caller-scoped `memberships` list — reuses the same mapping/labels as members-utils.ts / membership-status.ts (no invented labels). Returns `null` when no membership row exists for that persona — the normal case for a representado (the backend never exposes a dependent's membership), rendered as an honest "no disponible" fallback, not a false "sin membresía" claim. */
function describeMembership(
  memberships: StudentMembershipSummary[],
  personaId: string,
): { label: string; badgeClass: string } | null {
  const match = memberships.find((membership) => String(membership.personaId) === personaId);
  if (!match) return null;
  const estado = MEMBERSHIP_STATUS_BY_ESTADO[match.estado as keyof typeof MEMBERSHIP_STATUS_BY_ESTADO];
  return { label: MEMBERSHIP_STATUS_LABELS[estado], badgeClass: MEMBERSHIP_STATUS_BADGE[estado] };
}

const NO_MEMBERSHIP_FALLBACK = "No disponible — consulte con administración";

type StaffLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; perfil: PerfilPropio };

type StudentLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: StudentPortalSummary };

// ---------------------------------------------------------------------------
// Loading / error blocks — shared shape for both branches
// ---------------------------------------------------------------------------

function LoadingBlock({ text }: { text: string }): React.ReactElement {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-cata-text/65">{text}</p>
    </div>
  );
}

function ErrorBlock({
  message,
  onRetry,
  showIcon,
}: {
  message: string;
  onRetry: () => void;
  showIcon?: boolean;
}): React.ReactElement {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      {showIcon && <AlertTriangle size={28} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
      <p role="alert" className="text-sm text-cata-red">
        {message}
      </p>
      <button type="button" onClick={onRetry} className="btn-ghost text-xs">
        Reintentar
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Representado summary card — read-only, same data source as /student
// (fetchStudentPortal), used below the main grid for a representante's
// managed dependents. Kept as its own small component (pre-existing pattern
// from the previous iteration of this page), just no longer used for the
// caller's own (self) profile — that's now integrated into the hero card.
// ---------------------------------------------------------------------------

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
        <h3 className="text-base font-bold tracking-tight text-cata-text">{fullName}</h3>
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
              <span className="text-sm text-cata-text/65">{NO_MEMBERSHIP_FALLBACK}</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unified layout — header + hero + 3-column grid + banner. Content within
// each shared section branches by `kind` ("staff" vs "student"); the page
// structure itself is a single tree, not two separate top-level views.
// ---------------------------------------------------------------------------

type ProfileLayoutProps =
  | {
      kind: "staff";
      role: UserRole;
      perfil: PerfilPropio;
      accountEmail: string;
      onSaved: (perfil: PerfilPropio) => void;
    }
  | {
      kind: "student";
      role: UserRole;
      data: StudentPortalSummary;
      sessionEmail: string;
      sessionName: string;
    };

function ProfileLayout(props: ProfileLayoutProps): React.ReactElement {
  // ---- Staff-only inline edit / change-password state. Always declared
  // (hooks can't be conditional) — simply unused on the student branch. ----
  const [editing, setEditing] = useState(false);
  const [correo, setCorreo] = useState(props.kind === "staff" ? props.perfil.correo : "");
  const [telefono, setTelefono] = useState(props.kind === "staff" ? props.perfil.telefono : "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [requestingPassword, setRequestingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function startEditing(): void {
    if (props.kind !== "staff") return;
    setCorreo(props.perfil.correo);
    setTelefono(props.perfil.telefono);
    setSaveError(null);
    setSaveSuccess(false);
    setEditing(true);
  }

  function cancelEditing(): void {
    if (props.kind !== "staff") return;
    setCorreo(props.perfil.correo);
    setTelefono(props.perfil.telefono);
    setSaveError(null);
    setEditing(false);
  }

  async function handleSave(): Promise<void> {
    if (props.kind !== "staff") return;
    const perfil = props.perfil;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await actualizarMiPerfil({
        correo: correo.trim(),
        telefono: telefono.trim(),
      });
      props.onSaved(updated);
      setEditing(false);
      setSaveSuccess(true);
    } catch (error: unknown) {
      // Revert — a rejected edit must never be left displayed as if it were
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
    if (props.kind !== "staff") return;
    setRequestingPassword(true);
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      const result = await solicitarRecuperacion(props.accountEmail);
      setPasswordMessage(result.mensaje);
    } catch (error: unknown) {
      setPasswordError(toErrorMessage(error, "No se pudo enviar el correo de recuperación."));
    } finally {
      setRequestingPassword(false);
    }
  }

  const self = props.kind === "student" ? props.data.self : null;
  const representados = props.kind === "student" ? props.data.representados : [];

  const fullName =
    props.kind === "staff"
      ? `${props.perfil.nombres} ${props.perfil.apellidos}`.trim()
      : self
        ? `${self.nombres} ${self.apellidos}`.trim()
        : props.sessionName;

  const correoDisplay = props.kind === "staff" ? props.perfil.correo : props.sessionEmail;
  const roleLabel = getRoleLabel(props.role);
  const firstName = firstNameOf(fullName);

  const ranking = self ? describeRanking(self.ranking) : null;
  // Only the self profile has a real membership status here — a `self:
  // null` account (a representante with no own alumno profile) has no
  // personal status to report, so the hero deliberately shows nothing for
  // it instead of a misleading "no disponible" claim.
  const membership = props.kind === "student" && self ? describeMembership(props.data.memberships, self.personaId) : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-cata-text">Mi cuenta</h1>
          <p className="mt-1 text-sm text-cata-text/65">
            Gestiona tu información y consulta tu estado en el sistema.
          </p>
        </div>
        {props.kind === "student" && (
          <Link href="/student" className="btn-secondary inline-flex items-center gap-2 text-sm">
            Ver portal completo
            <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        )}
      </div>

      {/* Hero card */}
      <div data-testid="profile-hero" className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 opacity-[0.06]" aria-hidden="true">
          <ShieldCheck size={180} strokeWidth={1} className="text-cata-red" />
        </div>

        <div className="relative grid gap-6 sm:grid-cols-2 sm:items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Left: avatar + name + correo + status badge */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cata-red/10">
              <User size={28} className="text-cata-red" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-cata-text">{fullName}</h2>
              <p className="text-sm text-cata-text/65">{correoDisplay}</p>
              <div className="mt-1.5">
                {props.kind === "staff" ? (
                  <span className="badge badge-neutral">
                    <Shield size={11} strokeWidth={1.5} aria-hidden="true" />
                    {roleLabel}
                  </span>
                ) : self ? (
                  membership ? (
                    <span className={`badge ${membership.badgeClass}`}>{membership.label}</span>
                  ) : (
                    <span className="text-xs text-cata-text/65">{NO_MEMBERSHIP_FALLBACK}</span>
                  )
                ) : null}
              </div>
            </div>
          </div>

          {/* Center: two stacked info blocks */}
          <div className="grid gap-4 sm:grid-cols-2 lg:border-l lg:border-cata-border lg:pl-6">
            {props.kind === "staff" ? (
              <>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-cata-text/65">
                    <Shield size={13} strokeWidth={1.5} aria-hidden="true" />
                    Rol
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-cata-text">{roleLabel}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-cata-text/65">
                    <Calendar size={13} strokeWidth={1.5} aria-hidden="true" />
                    Miembro desde
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-cata-text">{formatDate(props.perfil.fechaCreacion)}</dd>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-cata-text/65">
                    <Trophy size={13} strokeWidth={1.5} aria-hidden="true" />
                    Ranking / Nivel
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-cata-text">
                    {ranking ? ranking.label : self ? "No disponible" : "No aplica"}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-cata-text/65">
                    <ShieldCheck size={13} strokeWidth={1.5} aria-hidden="true" />
                    Suscripción / Membresía
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-cata-text">
                    {membership ? membership.label : self ? "No disponible" : "No aplica"}
                  </dd>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Three-column grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Column 1 — Información personal */}
        <div data-testid="profile-column-info" className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <User size={16} className="text-cata-text/65" strokeWidth={1.5} aria-hidden="true" />
            <h3 className="text-sm font-bold tracking-tight text-cata-text">Información personal</h3>
          </div>

          <dl className="space-y-4">
            <div>
              <dt className="mb-1 flex items-center gap-1.5 text-xs font-medium text-cata-text/65">
                <User size={13} strokeWidth={1.5} aria-hidden="true" />
                Nombre completo
              </dt>
              <dd className="text-sm text-cata-text">{fullName}</dd>
            </div>

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
              {props.kind === "staff" && editing ? (
                <input
                  id="perfil-correo"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  disabled={saving}
                  className="input-field w-full"
                />
              ) : (
                <dd className="text-sm text-cata-text">{correoDisplay}</dd>
              )}
            </div>

            {props.kind === "staff" && (
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
                  <dd className="text-sm text-cata-text">{props.perfil.telefono}</dd>
                )}
              </div>
            )}

            {props.kind === "staff" && (
              <div>
                <dt className="mb-1 flex items-center gap-1.5 text-xs font-medium text-cata-text/65">
                  <Calendar size={13} strokeWidth={1.5} aria-hidden="true" />
                  Fecha de registro
                </dt>
                <dd className="text-sm text-cata-text">{formatDate(props.perfil.fechaCreacion)}</dd>
              </div>
            )}
          </dl>

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

          <div className="mt-5 border-t border-cata-border pt-4">
            {props.kind === "staff" ? (
              editing ? (
                <div className="flex flex-wrap items-center gap-3">
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
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startEditing}
                  className="btn-secondary w-full items-center gap-2"
                >
                  <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
                  Editar información
                </button>
              )
            ) : (
              <p className="text-xs text-cata-text/50">Esta información no se puede editar desde aquí.</p>
            )}
          </div>
        </div>

        {/* Column 2 — Estado de cuenta / Contexto */}
        <div data-testid="profile-column-status" className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-cata-text/65" strokeWidth={1.5} aria-hidden="true" />
            <h3 className="text-sm font-bold tracking-tight text-cata-text">Estado de cuenta</h3>
          </div>

          <div className="rounded-xl bg-cata-state-ok/10 p-4">
            {props.kind === "staff" ? (
              <>
                <p className="text-xs font-medium text-cata-text/65">Roles asignados</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {props.perfil.roles.map((rol) => (
                    <span key={rol} className="badge badge-neutral">
                      {rol}
                    </span>
                  ))}
                </div>
              </>
            ) : self ? (
              membership ? (
                <>
                  <p className="text-xs font-medium text-cata-text/65">Estado de la membresía</p>
                  <span className={`badge mt-2 ${membership.badgeClass}`}>{membership.label}</span>
                </>
              ) : (
                <p className="text-sm text-cata-text/65">{NO_MEMBERSHIP_FALLBACK}</p>
              )
            ) : (
              // No `self` profile at all (a representante managing only
              // dependents, no own alumno role) — distinct copy from the
              // membership-lookup fallback above, since there is nothing to
              // "consult with administration" about here, just no personal
              // account to summarize.
              <p className="text-sm text-cata-text/65">
                Esta cuenta no tiene un perfil propio — administra a sus estudiantes desde aquí.
              </p>
            )}
          </div>

          <p className="mt-3 text-xs text-cata-text/50">
            {props.kind === "staff"
              ? "Permisos asignados a tu cuenta en el sistema."
              : self
                ? membership
                  ? "No hay una fecha de renovación disponible en este resumen."
                  : "Consulte con administración para más detalles sobre su membresía."
                : "Vea el resumen de cada estudiante a continuación."}
          </p>

          <div className="mt-5 border-t border-cata-border pt-4">
            {props.kind === "student" ? (
              <Link href="/student" className="btn-secondary w-full items-center justify-center">
                Ver detalles
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleChangePassword()}
                  disabled={requestingPassword}
                  className="btn-secondary w-full items-center gap-2 disabled:opacity-50"
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
              </>
            )}
          </div>
        </div>

        {/* Column 3 — Accesos rápidos */}
        <div data-testid="profile-column-links" className="card p-5 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <Zap size={16} className="text-cata-text/65" strokeWidth={1.5} aria-hidden="true" />
            <h3 className="text-sm font-bold tracking-tight text-cata-text">Accesos rápidos</h3>
          </div>
          <nav className="space-y-1">
            {getNavLinksForRole(props.role).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-cata-text transition-colors duration-200 hover:bg-cata-bg"
              >
                {link.label}
                <ChevronRight size={14} strokeWidth={1.5} className="text-cata-text/40" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Representados — read-only summary cards for managed dependents. */}
      {props.kind === "student" && representados.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold tracking-tight text-cata-text">Estudiantes a mi cargo</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {representados.map((profile) => (
              // The backend only ever scopes /membresias/mias to the JWT
              // owner's own persona — never a represented dependent's, so
              // this always passes [] to force the honest "no disponible"
              // fallback rather than falsely reporting "sin membresía".
              <StudentSummaryCard key={profile.personaId} profile={profile} memberships={[]} />
            ))}
          </div>
        </div>
      )}

      {/* Bottom banner */}
      <div className="card flex items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          {props.kind === "staff" ? (
            <ShieldCheck size={22} className="shrink-0 text-cata-red" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Trophy size={22} className="shrink-0 text-cata-red" strokeWidth={1.5} aria-hidden="true" />
          )}
          <p className="text-sm text-cata-text">
            {props.kind === "staff"
              ? `Gracias por tu trabajo administrando Cata Club, ${firstName}.`
              : `Gracias por ser parte de Cata Club, ${firstName}. ¡Sigue entrenando!`}
          </p>
        </div>
        {props.kind === "staff" ? (
          <Shield size={18} className="shrink-0 text-cata-text/20" strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <ShieldCheck size={18} className="shrink-0 text-cata-text/20" strokeWidth={1.5} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content — data fetching + role branch into the unified layout
// ---------------------------------------------------------------------------

function ProfileContent(): React.ReactElement | null {
  const { session } = useAuth();
  const role = session?.user.role ?? null;
  const isStudentRole = role !== null && STUDENT_SUMMARY_ROLES.has(role);

  const [staffState, setStaffState] = useState<StaffLoadState>({ status: "loading" });
  const [staffReload, setStaffReload] = useState(0);

  useEffect(() => {
    if (isStudentRole) return;
    let cancelled = false;
    setStaffState({ status: "loading" });
    fetchMiPerfil()
      .then((perfil) => {
        if (!cancelled) setStaffState({ status: "ready", perfil });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStaffState({
            status: "error",
            message: toErrorMessage(error, "No se pudo cargar su perfil."),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isStudentRole, staffReload]);

  const personaId = session?.user.id ?? "";
  const [studentState, setStudentState] = useState<StudentLoadState>({ status: "loading" });
  const [studentReload, setStudentReload] = useState(0);

  useEffect(() => {
    if (!isStudentRole || !personaId) return;
    let cancelled = false;
    setStudentState({ status: "loading" });
    fetchStudentPortal(personaId)
      .then((data) => {
        if (!cancelled) setStudentState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStudentState({
            status: "error",
            message: toErrorMessage(error, "No se pudo cargar su cuenta."),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isStudentRole, personaId, studentReload]);

  if (role === null) return null;

  if (isStudentRole) {
    if (studentState.status === "loading") return <LoadingBlock text="Cargando su cuenta..." />;
    if (studentState.status === "error") {
      return (
        <ErrorBlock
          message={studentState.message}
          onRetry={() => setStudentReload((n) => n + 1)}
          showIcon
        />
      );
    }
    return (
      <ProfileLayout
        kind="student"
        role={role}
        data={studentState.data}
        sessionEmail={session?.user.email ?? ""}
        sessionName={session?.user.name ?? ""}
      />
    );
  }

  if (staffState.status === "loading") return <LoadingBlock text="Cargando perfil..." />;
  if (staffState.status === "error") {
    return <ErrorBlock message={staffState.message} onRetry={() => setStaffReload((n) => n + 1)} />;
  }

  return (
    <ProfileLayout
      kind="staff"
      role={role}
      perfil={staffState.perfil}
      accountEmail={staffState.perfil.correo ?? session?.user.email}
      onSaved={(perfil) => setStaffState({ status: "ready", perfil })}
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
