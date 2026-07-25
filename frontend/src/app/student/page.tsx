"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentPortal, fetchPagosDePersona, independizarPersona } from "@/services/api";
import type { StudentPortalSummary, StudentProfileSummary, PagoPersona } from "@/services/api";
import { formatCurrency, formatDate } from "@/lib/format-utils";
import { EmptyState, ErrorState, LoadingState, buttonClasses } from "@/components/ui";
import AgeUpConfirmation from "@/components/AgeUpConfirmation";
import ManagedStudentPicker, { useManagedProfiles } from "./ManagedStudentPicker";
import {
  derivePortalMode,
  isRepresentative,
  isMinor,
  describeMembershipState,
  daysUntil,
  formatLevelName,
  resolveCoverageEnd,
  summarizeRecentAttendance,
} from "./student-utils";
import { ShieldCheck, User, UserPlus, UserMinus, ArrowRight } from "lucide-react";

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
  return formatLevelName(ranking.nivelNombre);
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
  // The same reading `/student/payments` shows, from the same function — the
  // two screens used to word this differently for the same `estado`.
  const membership = describeMembershipState(profile.membership?.estado);
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
// "Su situación" — the two answers this page owes the reader
//
// The audit's complaint about this screen ("el dashboard para el perfil no
// dice nada") was not that it lacked content: it had a carnet, a training
// panel and a five-row session list. It was that none of them answered either
// question a family opens the portal with — am I up to date with the club, and
// has my child been going. Those two answers now sit together, above
// everything else, each ending in the screen that owns it.
//
// The two halves live in ONE card with a divider rather than in two cards
// side by side. A pair of equal cards reads as a grid of tiles you scan; a
// divided panel reads as one status you take in at once, which is what this is.
//
// Every value below is counted or read from the payload:
//
//   - the membership line is `Membresia.estado`, via the same
//     `describeMembershipState` the carnet and /student/payments use;
//   - "cobertura pagada hasta" is the furthest `fechaFin` among APPROVED
//     payments (`resolveCoverageEnd`), which is the only real coverage date
//     in the system — `MembershipSummary.fechaFin` is declared on the client
//     type but never produced by the adapter, so it is not read here;
//   - "un pago esperando validación" is a count of the persona's own pagos;
//   - the attendance line is the counted recap over the sessions received.
//
// No amount due, no due date, no attendance percentage: the backend has no
// source for any of the three.
// ---------------------------------------------------------------------------

function SituationHalf({
  kicker,
  headline,
  detail,
  action,
}: {
  kicker: string;
  headline: React.ReactNode;
  detail: React.ReactNode;
  action: React.ReactNode;
}): React.ReactElement {
  return (
    // `h-full` plus the growing detail line keeps both actions on the same
    // baseline when one half's copy runs a line longer than the other's.
    <div className="flex h-full flex-col gap-1.5 px-5 py-[18px]">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-ink-3">{kicker}</p>
      <h3 className="text-[17px] font-bold leading-snug tracking-tight text-ink">{headline}</h3>
      <p className="flex-1 text-[13px] leading-relaxed text-ink-3">{detail}</p>
      <div className="mt-1.5">{action}</div>
    </div>
  );
}

/**
 * What the paid-through date MEANS, in the words a family would use.
 *
 * The carnet two hundred pixels above already prints "Cobertura hasta
 * 28/07/2026". Repeating that date as this panel's headline made the panel a
 * second copy of the card rather than an answer, so the headline carries the
 * reading instead: how long is left, or how long ago it ran out. The date
 * itself stays, once, in the supporting line.
 *
 * This is arithmetic on an approved payment, not a projection — there is no
 * renewal date anywhere in the backend and none is implied here.
 */
function describeCoverage(daysLeft: number): string {
  if (daysLeft > 1) return `Le quedan ${daysLeft} días de cobertura`;
  if (daysLeft === 1) return "Le queda 1 día de cobertura";
  if (daysLeft === 0) return "Su cobertura termina hoy";
  if (daysLeft === -1) return "Su cobertura venció ayer";
  return `Su cobertura venció hace ${Math.abs(daysLeft)} días`;
}

/** A text action that reads as a destination, not as a button competing with the page's real CTAs. */
function SituationLink({ href, children }: { href: string; children: React.ReactNode }): React.ReactElement {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded text-[13px] font-semibold text-ink underline decoration-line-2 decoration-2 underline-offset-4 transition-colors hover:decoration-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ball"
    >
      {children}
      <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
    </Link>
  );
}

function SituationPanel({
  profile,
  coverageEnd,
  pendingPagos,
  paymentsAreReadOnly,
}: {
  profile: StudentProfileSummary;
  coverageEnd: string | null;
  pendingPagos: number;
  /** True only for a minor looking at their own account — see `ActivePortalView`. */
  paymentsAreReadOnly: boolean;
}): React.ReactElement {
  const membership = describeMembershipState(profile.membership?.estado);
  const daysLeft = daysUntil(coverageEnd);
  const recap = summarizeRecentAttendance(profile.recentSessions);
  const lastSession = profile.recentSessions[0] ?? null;

  return (
    <section
      data-testid="student-situation"
      aria-label="Su situación en el club"
      className="card grid overflow-hidden sm:grid-cols-2"
    >
      <div className="border-b border-line sm:border-b-0 sm:border-r">
        <SituationHalf
          kicker="Membresía y pagos"
          // The state pill lives on the carnet directly above; repeating it
          // here would put the same badge twice within one screenful. This
          // half carries the READING of that state, which the carnet cannot.
          headline={daysLeft === null ? membership.label : describeCoverage(daysLeft)}
          detail={
            <>
              {coverageEnd ? (
                <>
                  Su último pago aprobado cubre hasta el{" "}
                  <b className="font-semibold tabular-nums text-ink">{formatDate(coverageEnd)}</b>.
                </>
              ) : (
                "Todavía no hay ningún pago aprobado en su historial."
              )}
              {pendingPagos > 0 && (
                <>
                  {" "}
                  {pendingPagos === 1
                    ? "Hay 1 pago esperando la validación del club."
                    : `Hay ${pendingPagos} pagos esperando la validación del club.`}
                </>
              )}
            </>
          }
          action={
            paymentsAreReadOnly ? (
              <SituationLink href="/student/payments">Ver mis pagos</SituationLink>
            ) : (
              <SituationLink href="/student/payments">
                Registrar pago o renovar membresía
              </SituationLink>
            )
          }
        />
      </div>

      <div>
        <SituationHalf
          kicker="Entrenamientos"
          headline={
            lastSession ? (
              <>
                {lastSession.horario}
                <span className="block text-[13px] font-semibold tabular-nums text-ink-3">
                  {formatDate(lastSession.fecha)}
                </span>
              </>
            ) : (
              <>Todavía no hay entrenamientos registrados</>
            )
          }
          detail={
            recap ? (
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
            )
          }
          action={<SituationLink href="/student/attendance">Ver mis asistencias</SituationLink>}
        />
      </div>
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
  accountPersonaId,
  onIndependizar,
}: {
  data: StudentPortalSummary;
  hasAlumnoRole: boolean;
  /** The persona behind the SESSION — not the profile currently selected. */
  accountPersonaId: string;
  onIndependizar: () => void;
}): React.ReactElement {
  const { managedProfiles, selectedId, setSelectedId, selectedProfile } = useManagedProfiles(
    data,
    hasAlumnoRole,
  );

  const representative = isRepresentative(data.representados.length);
  const selfIsMinor = isMinor(data.self?.fechaNacimiento);
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
  const pendingPagos = useMemo(
    () =>
      pagosState.status === "ready"
        ? pagosState.pagos.filter((pago) => pago.estadoPago === "PENDIENTE_VALIDACION").length
        : 0,
    [pagosState],
  );
  const selectedIsMinor = isMinor(selectedProfile?.fechaNacimiento);
  /**
   * Whether the profile on screen is the account holder's own, rather than a
   * dependent they manage. Several things below turn on it, and every one of
   * them used to turn on the age of the SELECTED profile instead — which is
   * the same question only for a self-managed student.
   */
  const viewingOwnProfile =
    selectedProfile !== null && selectedProfile.personaId === accountPersonaId;
  /**
   * Only a minor looking at their OWN account is read-only on payments. A
   * representante looking at their minor child is the person the backend
   * expects to pay (`registrarPago` authorizes the owner, their representative
   * or an ADMINISTRADOR), so they get the real CTA.
   */
  const paymentsAreReadOnly = selectedIsMinor && viewingOwnProfile;
  const hasAccountActions =
    representative || !hasAlumnoRole || data.self?.representanteId != null;

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5">
      {/* The greeting is NOT a heading here. It used to be a 26px h2 directly
          under `PageHeader`'s own 26px h1, which stacked "ÁREA DE ESTUDIANTES
          / Mi cuenta / Hola, Ana" — three title-weight lines before a single
          fact — and then repeated the same name in the carnet immediately
          below. It now rides in `AppShell`'s subtitle slot, on the header row
          where it belongs. */}

      {/* Guardian → dependent switcher. The audit named this genuinely
          club-specific: a representante lands on one child and swaps to the
          next without leaving the page. */}
      <ManagedStudentPicker
        id="student-select"
        profiles={managedProfiles}
        value={selectedId}
        onChange={setSelectedId}
      />

      {/* Only on the minor's OWN account. Shown to a guardian looking at their
          dependent it read "Su representante: Laura Vera" to Laura Vera — the
          card names the person the reader should turn to, and the reader was
          that person. */}
      {selectedIsMinor && viewingOwnProfile && selectedProfile?.representante && (
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
          <SituationPanel
            profile={selectedProfile}
            coverageEnd={coverageEnd}
            pendingPagos={pendingPagos}
            paymentsAreReadOnly={paymentsAreReadOnly}
          />
        </>
      )}

      {/* A minor manages nothing on their own account: no dependents, no
          payments, no independentization. Everything below is gated on that.

          A self-managed student with no dependents sees no "agregar
          dependiente" either: that CTA used to point at the PUBLIC enrolment
          wizard, which creates a whole second account and user — and
          `/student/add-dependent` is gated to `representante`, so they could
          not use the honest route either. Offering it was worse than nothing.

          `hasAccountActions` exists because the row is now genuinely optional:
          the payments CTA moved into `SituationPanel` (where the fact it acts
          on is stated), so a self-managed adult with no dependents and no
          representative has nothing left to put here, and an empty flex row
          still costs a 20px gap under the panel. */}
      {!selfIsMinor && hasAccountActions && (
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

  // The greeting rides on the header row rather than in a heading of its own
  // (see `ActivePortalView`). While the portal is still loading there is no
  // name to greet, so the slot stays empty instead of flashing a placeholder.
  const portalMode =
    state.status === "ready"
      ? derivePortalMode(hasAlumnoRole, state.data.representados.length)
      : null;
  const subtitle =
    portalMode === "active" && greetingName
      ? `Hola, ${greetingName}. Esto es lo que el club tiene registrado.`
      : undefined;

  return (
    <AppShell eyebrow="Área de estudiantes" title="Mi cuenta" subtitle={subtitle}>
      {state.status === "loading" && (
        <div className="card">
          <LoadingState label="Cargando su cuenta…" />
        </div>
      )}
      {state.status === "error" && (
        <ErrorState message={state.message} onRetry={() => setReloadToken((n) => n + 1)} />
      )}
      {state.status === "ready" &&
        (portalMode === "pending" ? (
          <PendingEnrollmentView data={state.data} />
        ) : (
          <ActivePortalView
            data={state.data}
            hasAlumnoRole={hasAlumnoRole}
            accountPersonaId={personaId}
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
