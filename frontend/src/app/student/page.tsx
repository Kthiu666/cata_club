"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentPortal, fetchPagosDePersona, independizarPersona } from "@/services/api";
import type { StudentPortalSummary, StudentProfileSummary, PagoPersona, MembershipSummary } from "@/services/api";
import { getAttendanceBadgeTone, getAttendanceLabel } from "@/app/attendance/attendance-utils";
import { formatCurrency, formatDate } from "@/lib/format-utils";
import { Badge, EmptyState, ErrorState, LoadingState, buttonClasses } from "@/components/ui";
import AgeUpConfirmation from "@/components/AgeUpConfirmation";
import {
  derivePortalMode,
  isRepresentative,
  isMinor,
  describeRanking,
  parseLevelNumber,
  resolveCoverageEnd,
  summarizeRecentAttendance,
} from "./student-utils";
import {
  Calendar,
  ShieldCheck,
  CreditCard,
  User,
  ChevronDown,
  UserPlus,
  UserMinus,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Load state
// ---------------------------------------------------------------------------

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: StudentPortalSummary };

type PagosState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pagos: PagoPersona[] };

// ---------------------------------------------------------------------------
// The club membership card (`.carnet`, _sistema.css:291-304)
//
// This is the one thing a parent screenshots, so it is an identity document
// and is held to that standard: every field on it is real. The prototype's
// "Miembro nº", "Desde" and "Renueva" are NOT rendered — see the block comment
// above `parseLevelNumber` in student-utils.ts for where each one dies.
// ---------------------------------------------------------------------------

function levelTagLabel(profile: StudentProfileSummary): string | null {
  const { ranking } = profile;
  if (ranking.status !== "available" || !ranking.estaEnRanking) return null;
  const rung = parseLevelNumber(ranking.nivelNombre);
  if (rung !== null) return `Nivel ${rung}`;
  return ranking.nivelNombre;
}

function membershipTag(membership: MembershipSummary | null): { label: string; active: boolean } {
  if (!membership) return { label: "Sin membresía", active: false };
  if (membership.estado === "ACTIVA") return { label: "Membresía activa", active: true };
  if (membership.estado === "INACTIVA") return { label: "Membresía pendiente", active: false };
  return { label: "Membresía vencida", active: false };
}

function CarnetFact({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div>
      <span className="block text-[9px] font-normal uppercase tracking-[0.12em] text-white/40">
        {label}
      </span>
      <b className="text-[12.5px] font-bold tabular-nums">{value}</b>
    </div>
  );
}

function Carnet({
  profile,
  coverageEnd,
}: {
  profile: StudentProfileSummary;
  coverageEnd: string | null;
}): React.ReactElement {
  const fullName = `${profile.nombres} ${profile.apellidos}`.trim();
  const level = levelTagLabel(profile);
  const membership = membershipTag(profile.membership);
  const facts: { label: string; value: string }[] = [];
  // "Socio desde" rather than the prototype's "MIEMBRO Nº · DESDE": the backend
  // has no member-number concept, and printing the surrogate persona id as one
  // would invent an identity-document field. The activation date IS real.
  if (profile.membership?.fechaActivacion) {
    facts.push({ label: "Socio desde", value: formatDate(profile.membership.fechaActivacion) });
  }
  if (profile.membership?.categoria) facts.push({ label: "Plan", value: profile.membership.categoria });
  if (profile.membership?.franjaHoraria) facts.push({ label: "Franja", value: profile.membership.franjaHoraria });
  if (profile.membership?.modalidad) {
    facts.push({
      label: "Modalidad",
      value: profile.membership.modalidad === "PERSONALIZADA" ? "Personalizada" : "Mensual",
    });
  }
  if (profile.membership?.montoAplicado) {
    facts.push({ label: "Monto", value: formatCurrency(Number(profile.membership.montoAplicado)) });
  }
  if (coverageEnd) facts.push({ label: "Cobertura hasta", value: formatDate(coverageEnd) });

  return (
    <section
      data-testid="student-carnet"
      aria-label={`Carnet de socio de ${fullName}`}
      className="relative flex flex-col gap-3.5 overflow-hidden rounded-card bg-gradient-to-br from-coal to-[#2A2A33] px-6 py-[22px] text-white"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-[46px] -top-[46px] h-[150px] w-[150px] rounded-full bg-ball/[0.08]"
      />

      <div className="relative z-10 flex items-center gap-[11px]">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center overflow-hidden rounded-full bg-white">
          <Image src="/brand/cata-club-logo.jpeg" alt="" width={30} height={30} className="h-[30px] w-[30px] object-cover" />
        </span>
        <div>
          <b className="block text-[12.5px] font-bold">Cata Club</b>
          <span className="block text-[10px] uppercase tracking-[0.12em] text-white/45">Tenis de mesa</span>
        </div>
      </div>

      <p className="relative z-10 text-2xl font-extrabold tracking-[-0.03em]">{fullName}</p>

      <div className="relative z-10 flex flex-wrap gap-2">
        {level !== null ? (
          <span className="h-badge inline-flex items-center rounded-full bg-l9 px-[11px] text-[11.5px] font-bold text-ink">
            {level}
          </span>
        ) : (
          <span className="h-badge inline-flex items-center rounded-full bg-white/[0.11] px-[11px] text-[11.5px] font-bold text-white">
            Sin nivel asignado
          </span>
        )}
        <span
          className={
            membership.active
              ? "h-badge inline-flex items-center gap-1.5 rounded-full bg-state-ok/20 px-[11px] text-[11.5px] font-bold text-[#7BE8A4]"
              : "h-badge inline-flex items-center gap-1.5 rounded-full bg-white/[0.11] px-[11px] text-[11.5px] font-bold text-white"
          }
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 flex-none rounded-full bg-current" />
          {membership.label}
        </span>
      </div>

      {facts.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-x-[26px] gap-y-2 border-t border-white/10 pt-[13px]">
          {facts.map((fact) => (
            <CarnetFact key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Training panel — carries one real fact, never a projected schedule.
//
// `attendance-adapter.ts` documents that Horario has no link to the persona or
// nivel it serves, so "tu próximo entrenamiento" cannot be derived per student.
// The panel therefore reports the LAST recorded session plus the attendance
// recap, both of which are real records.
// ---------------------------------------------------------------------------

function TrainingPanel({ profile }: { profile: StudentProfileSummary }): React.ReactElement {
  const last = profile.recentSessions[0] ?? null;
  const recap = summarizeRecentAttendance(profile.recentSessions);

  return (
    <section className="card p-5" aria-labelledby="training-panel-title">
      <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.13em] text-ink-3">
        Sus entrenamientos
      </p>
      <h2 id="training-panel-title" className="text-[17px] font-bold tracking-tight text-ink">
        {last ? `${last.horario} · ${formatDate(last.fecha)}` : "Todavía no hay entrenamientos registrados"}
      </h2>
      <p className="mt-1.5 text-[13px] text-ink-3">
        {recap ? (
          recap.total === 1 ? (
            <>
              De su última sesión registrada asistió a{" "}
              <b className="font-semibold text-ink">{recap.attended} de 1</b>.
            </>
          ) : (
            <>
              De sus últimas {recap.total} sesiones registradas asistió a{" "}
              <b className="font-semibold text-ink">
                {recap.attended} de {recap.total}
              </b>
              .
            </>
          )
        ) : (
          "Su asistencia aparecerá aquí en cuanto el entrenador tome lista."
        )}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Recent sessions
// ---------------------------------------------------------------------------

function RecentSessionsSection({ profile }: { profile: StudentProfileSummary }): React.ReactElement {
  return (
    <section className="card overflow-hidden" aria-labelledby="sessions-title">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Calendar size={16} strokeWidth={1.5} className="text-ink-3" aria-hidden="true" />
        <h2 id="sessions-title" className="flex-1 text-[13px] font-bold text-ink">
          Asistencia reciente
        </h2>
      </div>
      {profile.recentSessions.length === 0 ? (
        <EmptyState
          icon={<Calendar size={21} strokeWidth={1.5} aria-hidden="true" />}
          title="Aún no hay asistencias registradas"
          description="Las sesiones aparecerán aquí en cuanto el entrenador tome lista."
        />
      ) : (
        <ul className="flex flex-col">
          {profile.recentSessions.map((session) => (
            <li
              key={`${session.fecha}-${session.horario}`}
              className="flex h-drow items-center gap-4 border-b border-line px-5 last:border-b-0"
            >
              <span className="w-[150px] flex-none text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-3">
                {formatDate(session.fecha)}
              </span>
              <span className="flex-1 text-sm font-semibold text-ink">{session.horario}</span>
              <Badge tone={getAttendanceBadgeTone(session.estado)}>
                {getAttendanceLabel(session.estado)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Membership plan catalog — pending-enrollment view only
// ---------------------------------------------------------------------------

function MembershipPlansGrid({ data }: { data: StudentPortalSummary }): React.ReactElement {
  if (data.membershipPlans.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={<ShieldCheck size={21} strokeWidth={1.5} aria-hidden="true" />}
          title="No hay planes de membresía disponibles"
          description="El catálogo de planes está vacío en este momento. Consulte con administración."
        />
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.membershipPlans.map((plan) => (
        <div key={plan.id} className="card flex flex-col p-5">
          <h3 className="text-base font-bold text-ink">{plan.nombre}</h3>
          <span className="mt-2 text-2xl font-extrabold tabular-nums text-ink">
            {formatCurrency(plan.precio)}
          </span>
          <p className="mt-1 text-xs text-ink-3">{plan.franjaHoraria}</p>
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
    <div className="mx-auto w-full max-w-[760px] space-y-5">
      <section className="card p-6">
        <h2 className="text-[17px] font-bold tracking-tight text-ink">Bienvenido a Cata Club</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
          Su cuenta está creada pero todavía no tiene una matrícula activa. Complete su inscripción para
          empezar a entrenar.
        </p>
      </section>

      <MembershipPlansGrid data={data} />

      <div className="flex flex-wrap gap-3">
        <Link href="/student/enroll?type=self" className={buttonClasses("primary")}>
          <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
          Inscribirme como jugador
          <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </Link>
        <Link href="/student/enroll?type=child" className={buttonClasses("secondary")}>
          <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
          Inscribir a un hijo o dependiente
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
  greetingName,
  onIndependizar,
}: {
  data: StudentPortalSummary;
  hasAlumnoRole: boolean;
  greetingName: string;
  onIndependizar: () => void;
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
  const selfIsMinor = isMinor(data.self?.fechaNacimiento);
  const selectedProfile = managedProfiles.find((p) => p.personaId === selectedId) ?? managedProfiles[0] ?? null;
  const selectedPersonaId = selectedProfile?.personaId ?? "";

  // Payments are fetched here rather than inside `PagosSection` because the
  // carnet also needs them: the only real "coverage until" date in the system
  // is the furthest `fechaFin` among approved payments.
  const [pagosState, setPagosState] = useState<PagosState>({ status: "loading" });
  const [pagosReloadToken, setPagosReloadToken] = useState(0);

  useEffect(() => {
    if (!selectedPersonaId) return;
    let cancelled = false;
    setPagosState({ status: "loading" });
    fetchPagosDePersona(selectedPersonaId)
      .then((pagos) => {
        if (!cancelled) setPagosState({ status: "ready", pagos });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPagosState({
          status: "error",
          message: error instanceof Error ? error.message : "No se pudo cargar el historial de pagos.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPersonaId, pagosReloadToken]);

  const coverageEnd = useMemo(
    () => (pagosState.status === "ready" ? resolveCoverageEnd(pagosState.pagos) : null),
    [pagosState],
  );
  const selectedIsMinor = isMinor(selectedProfile?.fechaNacimiento);

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5">
      {/* An h2, not an h1: `AppShell` already renders the page's own h1 ("Mi
          cuenta") above <main>, and a second h1 would give the page two. */}
      <h2 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">Hola, {greetingName}</h2>

      {/* Guardian → dependent switcher. The audit named this genuinely
          club-specific: a representante lands on one child and swaps to the
          next without leaving the page. */}
      {managedProfiles.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="student-select" className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-ink-3">
            Estudiante
          </label>
          <div className="relative">
            <select
              id="student-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-ctl appearance-none rounded-ctl border border-line-2 bg-paper pl-3.5 pr-10 text-[13px] font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ball"
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
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3"
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      {selectedIsMinor && selectedProfile?.representante && (
        <section className="card flex items-center gap-3 p-5" aria-label="Su representante">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-canvas">
            <User size={18} strokeWidth={1.5} className="text-ink-3" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10.5px] font-bold uppercase tracking-[0.13em] text-ink-3">
              Su representante
            </span>
            <span className="block text-[13.5px] font-semibold text-ink">
              {selectedProfile.representante.nombres} {selectedProfile.representante.apellidos}
            </span>
          </span>
        </section>
      )}

      {selectedProfile === null ? (
        <div className="card">
          <EmptyState
            icon={<User size={21} strokeWidth={1.5} aria-hidden="true" />}
            title="No se encontraron estudiantes asociados a esta cuenta"
            description="Inscríbase como jugador o agregue un hijo o dependiente para empezar."
          />
        </div>
      ) : (
        <>
          <Carnet profile={selectedProfile} coverageEnd={coverageEnd} />
          <TrainingPanel profile={selectedProfile} />
          <RecentSessionsSection profile={selectedProfile} />
        </>
      )}

      {/* A minor manages nothing on their own account: no dependents, no
          payments, no independentization. Everything below is gated on that.

          A self-managed student with no dependents sees no "agregar
          dependiente" either: that CTA used to point at the PUBLIC enrolment
          wizard, which creates a whole second account and user — and
          `/student/add-dependent` is gated to `representante`, so they could
          not use the honest route either. Offering it was worse than nothing. */}
      {!selfIsMinor && (
        <div className="flex flex-wrap gap-3 pt-1">
          {representative && (
            <Link href="/student/add-dependent" className={buttonClasses("secondary")}>
              <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
              Agregar hijo o dependiente
              <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          )}
          {!hasAlumnoRole && (
            <Link href="/student/enroll?type=self" className={buttonClasses("secondary")}>
              <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
              Unirme como jugador
              <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          )}
          <Link href="/student/payments" className={buttonClasses("secondary")}>
            <CreditCard size={16} strokeWidth={1.5} aria-hidden="true" />
            Registrar pago o renovar membresía
            <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </Link>
          {data.self?.representanteId != null && (
            <button type="button" onClick={onIndependizar} className={buttonClasses("secondary")}>
              <UserMinus size={16} strokeWidth={1.5} aria-hidden="true" />
              Independizarse del representante
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** First given name — "Hola, Ana", not "Hola, Ana Maria Garcia Lopez". */
function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function StudentPortalContent(): React.ReactElement {
  const { session, refreshSession } = useAuth();
  const personaId = session?.user.id ?? "";
  const hasAlumnoRole = session?.user.role === "estudiante";

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [showAgeUpModal, setShowAgeUpModal] = useState(false);
  const [ageUpLoading, setAgeUpLoading] = useState(false);

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

  const greetingName =
    state.status === "ready" && state.data.self
      ? firstNameOf(state.data.self.nombres)
      : firstNameOf(session?.user.name ?? "");

  async function handleAgeUpConfirm(contrasenia: string): Promise<void> {
    if (!personaId) return;
    setAgeUpLoading(true);
    try {
      await independizarPersona(Number(personaId), contrasenia);
      await refreshSession();
      setReloadToken((n) => n + 1);
      setShowAgeUpModal(false);
    } finally {
      setAgeUpLoading(false);
    }
  }

  return (
    <AppShell eyebrow="Área de estudiantes" title="Mi cuenta">
      {state.status === "loading" && (
        <div className="card">
          <LoadingState label="Cargando su cuenta…" />
        </div>
      )}
      {state.status === "error" && (
        <ErrorState message={state.message} onRetry={() => setReloadToken((n) => n + 1)} />
      )}
      {state.status === "ready" &&
        (derivePortalMode(hasAlumnoRole, state.data.representados.length) === "pending" ? (
          <PendingEnrollmentView data={state.data} />
        ) : (
          <ActivePortalView
            data={state.data}
            hasAlumnoRole={hasAlumnoRole}
            greetingName={greetingName}
            onIndependizar={() => setShowAgeUpModal(true)}
          />
        ))}
      <AgeUpConfirmation
        open={showAgeUpModal}
        onConfirm={handleAgeUpConfirm}
        onCancel={() => setShowAgeUpModal(false)}
      />
    </AppShell>
  );
}

export default function StudentPage(): React.ReactElement {
  return (
    <ProtectedRoute allowedRoles={["representante", "estudiante", "unsupported"]}>
      <StudentPortalContent />
    </ProtectedRoute>
  );
}
