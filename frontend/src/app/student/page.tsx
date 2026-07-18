"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentPortal } from "@/services/api";
import type { StudentPortalSummary, StudentProfileSummary } from "@/services/api";
import { ATTENDANCE_LABELS, ATTENDANCE_BADGE_TOKENS } from "@/app/attendance/attendance-utils";
import { derivePortalMode, isRepresentative, buildAccountLabel, describeRanking } from "./student-utils";
import {
  Calendar,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  UserCircle,
  User,
  ChevronDown,
  GraduationCap,
  Building2,
  UserPlus,
  ArrowRight,
  Trophy,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Load state
// ---------------------------------------------------------------------------

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: StudentPortalSummary };

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function LoadingCard(): React.ReactElement {
  return (
    <div className="card flex min-h-[40vh] items-center justify-center p-6 text-center">
      <p className="text-sm text-cata-text/50">Cargando su cuenta...</p>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }): React.ReactElement {
  return (
    <div className="card p-6 text-center">
      <AlertTriangle size={28} strokeWidth={1.5} className="mx-auto mb-3 text-cata-red" aria-hidden="true" />
      <p className="mb-4 text-sm text-cata-text/65">{message}</p>
      <button type="button" onClick={onRetry} className="btn-secondary mx-auto inline-flex items-center gap-2">
        <RefreshCw size={14} strokeWidth={1.5} aria-hidden="true" />
        Reintentar
      </button>
    </div>
  );
}

/** Honest placeholder for membership/payment — no backend endpoint lets a student/representante read their own Membresia/Pago (see src/lib/server/student-adapter.ts). */
function MembershipUnavailableCard(): React.ReactElement {
  return (
    <div className="card-hover p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
          <ShieldCheck size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cata-text/65">Membresía</p>
          <p className="text-lg font-bold tracking-tight text-cata-text">No disponible</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-cata-text/65">
        El estado de su membresía no está disponible desde este portal por el momento. Consulte con
        administración del club.
      </p>
    </div>
  );
}

function PaymentUnavailableCard(): React.ReactElement {
  return (
    <div className="card-hover p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
          <CreditCard size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cata-text/65">Pagos</p>
          <p className="text-lg font-bold tracking-tight text-cata-text">No disponible</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-cata-text/65">
        El historial de pagos y la carga de comprobantes no están disponibles desde este portal por el
        momento. Consulte con administración del club para registrar o validar un pago.
      </p>
    </div>
  );
}

function RankingCard({ profile }: { profile: StudentProfileSummary }): React.ReactElement {
  const display = describeRanking(profile.ranking);
  return (
    <div className="card-hover mb-8 p-5 sm:p-6">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
          <Trophy size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cata-text/65">Ranking</p>
          <p className="text-lg font-bold tracking-tight text-cata-text">{display.label}</p>
        </div>
        <span className={display.badgeClass}>{profile.ranking.status === "available" ? "Disponible" : "No disponible"}</span>
      </div>
      <p className="text-sm text-cata-text/65">{display.detail}</p>
    </div>
  );
}

function RecentSessionsSection({ profile }: { profile: StudentProfileSummary }): React.ReactElement {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <Calendar size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        <h2 className="text-lg font-bold text-cata-text">Actividad Reciente — {profile.nombres}</h2>
      </div>
      {profile.recentSessions.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-cata-text/50">Aún no hay asistencias registradas.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {profile.recentSessions.map((session) => {
            const tokens = ATTENDANCE_BADGE_TOKENS[session.estado];
            return (
              <div key={`${session.fecha}-${session.horario}`} className="card-hover p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                    <Calendar size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-cata-text">{session.fecha}</p>
                    <p className="text-sm text-cata-text/65">{session.horario}</p>
                    <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tokens.badgeClass}`}>
                      {ATTENDANCE_LABELS[session.estado]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Real `TipoMembresia` catalog cards for the pending-enrollment view — replaces the old hardcoded `membershipPlans` array. */
function MembershipPlansGrid({ data }: { data: StudentPortalSummary }): React.ReactElement {
  if (data.membershipPlans.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-cata-text/50">No hay planes de membresía disponibles en este momento.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.membershipPlans.map((plan) => (
        <div key={plan.id} className="card-hover flex flex-col p-5 sm:p-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cata-red/15">
            <ShieldCheck size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-cata-text">{plan.nombre}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-cata-text">${plan.precio.toFixed(2)}</span>
          </div>
          <p className="mt-1 text-xs text-cata-text/65">{plan.franjaHoraria}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending-enrollment view — honest intermediate state for an authenticated
// persona with no ALUMNO role and no representados (see student-utils.ts's
// `derivePortalMode` doc comment for why this is not /unauthorized).
// ---------------------------------------------------------------------------

function PendingEnrollmentView({ data }: { data: StudentPortalSummary }): React.ReactElement {
  return (
    <div className="mb-8">
      <div className="mb-6 rounded-2xl border border-cata-border bg-cata-bg p-6">
        <div className="mb-3 flex items-center gap-2">
          <UserPlus size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-lg font-bold text-cata-text">Bienvenido a Cata Club</h2>
        </div>
        <p className="text-sm leading-relaxed text-cata-text/65">
          Su cuenta está creada pero todavía no tiene una matrícula activa. Elija el plan que mejor se
          adapte a sus necesidades y complete su inscripción, o inscriba a un hijo/dependiente, para
          comenzar a entrenar.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-cata-text/45">
          Una vez inscrito, desde su portal podrá agregar hijos o dependientes si necesita gestionar las
          membresías de su familia.
        </p>
      </div>

      <MembershipPlansGrid data={data} />

      <div className="mt-8 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
        <Link href="/student/enroll?type=self" className="btn-primary inline-flex items-center gap-2 shadow-soft">
          <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
          Inscribirme como Jugador
          <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </Link>
        <Link href="/student/enroll?type=child" className="btn-secondary inline-flex items-center gap-2">
          <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
          Inscribir hijo/dependiente
          <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active portal view — self-managed student and/or representante
// ---------------------------------------------------------------------------

function ActivePortalView({
  data,
  hasAlumnoRole,
}: {
  data: StudentPortalSummary;
  hasAlumnoRole: boolean;
}): React.ReactElement {
  const managedProfiles: StudentProfileSummary[] =
    hasAlumnoRole && data.self ? [data.self, ...data.representados] : data.representados;

  const [selectedId, setSelectedId] = useState<string>(managedProfiles[0]?.personaId ?? "");

  useEffect(() => {
    if (!managedProfiles.some((p) => p.personaId === selectedId)) {
      setSelectedId(managedProfiles[0]?.personaId ?? "");
    }
    // Only re-run when the set of managed profile ids actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedProfiles.map((p) => p.personaId).join(",")]);

  const representative = isRepresentative(data.representados.length);
  const accountLabel = buildAccountLabel(hasAlumnoRole, data.representados.length);
  const selectedProfile = managedProfiles.find((p) => p.personaId === selectedId) ?? managedProfiles[0] ?? null;

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            representative ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {representative ? (
            <Building2 size={12} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <GraduationCap size={12} strokeWidth={1.5} aria-hidden="true" />
          )}
          {accountLabel}
        </span>
        {representative && (
          <span className="text-xs text-cata-text/65">Gestiona {managedProfiles.length} estudiante(s)</span>
        )}
      </div>

      {managedProfiles.length > 1 && (
        <div className="mb-4">
          <label htmlFor="student-select" className="text-xs font-medium text-cata-text/45">
            Seleccionar estudiante
          </label>
          <div className="relative mt-1 inline-block">
            <select
              id="student-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="appearance-none rounded-xl border border-cata-border bg-cata-surface px-4 py-2 pr-10 text-sm font-medium text-cata-text shadow-sm transition-colors hover:border-cata-red/30 focus:border-cata-red/40 focus:outline-none focus:ring-2 focus:ring-cata-red/10"
            >
              {managedProfiles.map((profile) => (
                <option key={profile.personaId} value={profile.personaId}>
                  {profile.nombres} {profile.apellidos}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              strokeWidth={1.5}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/student/enroll?type=child"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition-all duration-200 hover:bg-blue-100"
        >
          <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
          {representative ? "Agregar hijo/dependiente" : "Inscribir hijo/dependiente"}
          <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </Link>
        {!hasAlumnoRole && (
          <Link
            href="/student/enroll?type=self"
            className="inline-flex items-center gap-2 rounded-xl bg-cata-red/15 px-4 py-2.5 text-sm font-medium text-cata-red transition-all duration-200 hover:bg-cata-red/25"
          >
            <GraduationCap size={16} strokeWidth={1.5} aria-hidden="true" />
            Unirme como jugador
            <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        )}
      </div>

      {selectedProfile === null ? (
        <div className="card p-6 text-center">
          <User size={32} strokeWidth={1.5} className="mx-auto mb-3 text-cata-text/20" aria-hidden="true" />
          <p className="text-sm text-cata-text/50">No se encontraron estudiantes asociados a esta cuenta.</p>
        </div>
      ) : (
        <>
          <RankingCard profile={selectedProfile} />

          <div className="mb-8 grid gap-5 sm:grid-cols-2">
            <MembershipUnavailableCard />
            <PaymentUnavailableCard />
          </div>

          <RecentSessionsSection profile={selectedProfile} />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function StudentPortalContent(): React.ReactElement {
  const { session } = useAuth();
  const personaId = session?.user.id ?? "";
  const hasAlumnoRole = session?.user.role === "estudiante";

  const [state, setState] = useState<LoadState>({ status: "loading" });
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
        if (cancelled) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "No se pudo cargar su cuenta.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [personaId, reloadToken]);

  const heroSubtitle =
    state.status === "ready"
      ? derivePortalMode(hasAlumnoRole, state.data.representados.length) === "pending"
        ? "Cuenta creada — aún no inscrito como estudiante."
        : "Membresía, ranking y actividad de su cuenta."
      : "Cargando información de su cuenta...";

  return (
    <div>
      {/* Hero Banner */}
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-cata-border bg-cata-surface px-6 py-10 shadow-elevated sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-logo-glow" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
            <UserCircle size={14} strokeWidth={2} aria-hidden="true" />
            Área de Estudiantes
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-cata-text sm:text-4xl">Portal de Cuenta</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-cata-text/60">{heroSubtitle}</p>
        </div>
      </div>

      {state.status === "loading" && <LoadingCard />}
      {state.status === "error" && <ErrorCard message={state.message} onRetry={() => setReloadToken((n) => n + 1)} />}
      {state.status === "ready" &&
        (derivePortalMode(hasAlumnoRole, state.data.representados.length) === "pending" ? (
          <PendingEnrollmentView data={state.data} />
        ) : (
          <ActivePortalView data={state.data} hasAlumnoRole={hasAlumnoRole} />
        ))}
    </div>
  );
}

export default function StudentPage(): React.ReactElement {
  return (
    <ProtectedRoute allowedRoles={["representante", "estudiante", "unsupported"]}>
      <StudentPortalContent />
    </ProtectedRoute>
  );
}
