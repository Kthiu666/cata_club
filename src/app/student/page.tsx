"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import {
  CreditCard,
  Calendar,
  ShieldCheck,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  UserCircle,
  User,
  ChevronDown,
  GraduationCap,
  Building2,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { getProofStatus, formatFileSize, getProofStatusColorClass } from "./proof-utils";
import type { ProofStatus, MembershipStatus } from "./proof-utils";

// ---------------------------------------------------------------------------
// Demo data — Account portal (frontend-only, no backend)
// ---------------------------------------------------------------------------

type PaymentStatus = "paid" | "pending" | "overdue";

/**
 * Demo scenario keys — internal to the UI, NOT domain MembershipStatus.
 *
 * These represent combined membership+payment states for demo purposes:
 *   - active:       membership activa, payment aprobado
 *   - pending_validation: payment submitted, awaiting admin approval
 *   - pending_payment:    no payment recorded yet
 *   - expired:      membership vencida or not renewed
 */
type DemoScenario = "active" | "pending_validation" | "pending_payment" | "expired";

interface UpcomingSession {
  date: string;
  time: string;
  court: string;
  group: string;
}

interface ScenarioData {
  membership: {
    status: MembershipStatus;
    type: string;
    period: string;
    startDate: string;
    endDate: string;
    fee: string;
  };
  payment: {
    status: PaymentStatus;
    method: string;
    paidOn: string;
    proofUploaded: boolean;
    validated: boolean;
  };
}

/** Demo student profile shown in the portal. */
interface DemoStudentInfo {
  id: string;
  nombre: string;
  /** The group name the student belongs to (e.g. "Principiantes"). Technical level is carried by the group, not the student. */
  grupo: string;
  scenarioData: ScenarioData;
  upcomingSessions: UpcomingSession[];
}

// All demo states in one place — drives membership & payment cards
const scenarioData: Record<DemoScenario, ScenarioData> = {
  active: {
    membership: {
      status: "activa",
      type: "Mensual",
      period: "Julio 2026",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      fee: "$85.00",
    },
    payment: {
      status: "paid",
      method: "Transferencia Bancaria",
      paidOn: "2026-06-28",
      proofUploaded: true,
      validated: true,
    },
  },
  pending_validation: {
    membership: {
      status: "activa",
      type: "Mensual",
      period: "Julio 2026",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      fee: "$85.00",
    },
    payment: {
      status: "pending",
      method: "Transferencia Bancaria",
      paidOn: "2026-06-28",
      proofUploaded: true,
      validated: false,
    },
  },
  pending_payment: {
    membership: {
      status: "vencida",
      type: "Mensual",
      period: "Julio 2026",
      startDate: "—",
      endDate: "—",
      fee: "$85.00",
    },
    payment: {
      status: "overdue",
      method: "—",
      paidOn: "—",
      proofUploaded: false,
      validated: false,
    },
  },
  expired: {
    membership: {
      status: "vencida",
      type: "Mensual",
      period: "Junio 2026",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      fee: "$85.00",
    },
    payment: {
      status: "overdue",
      method: "Transferencia Bancaria",
      paidOn: "2026-05-28",
      proofUploaded: true,
      validated: false,
    },
  },
};

const scenarioLabels: Record<DemoScenario, string> = {
  active: "Activa",
  pending_validation: "Pago en Validación",
  pending_payment: "Sin Pago",
  expired: "Vencida",
};

/** Session data for each demo student. */
const sessionsByStudent: Record<string, UpcomingSession[]> = {
  "student-sofia": [
    { date: "Lun, 30 Jun", time: "15:00 — 16:30", court: "Cancha 1", group: "Principiantes" },
    { date: "Mié, 2 Jul", time: "15:00 — 16:30", court: "Cancha 1", group: "Principiantes" },
    { date: "Lun, 7 Jul", time: "15:00 — 16:30", court: "Cancha 1", group: "Principiantes" },
    { date: "Mié, 9 Jul", time: "15:00 — 16:30", court: "Cancha 1", group: "Principiantes" },
  ],
  "student-mateo": [
    { date: "Lun, 30 Jun", time: "16:45 — 18:15", court: "Cancha 2", group: "Intermedios" },
    { date: "Mié, 2 Jul", time: "16:45 — 18:15", court: "Cancha 2", group: "Intermedios" },
    { date: "Lun, 7 Jul", time: "16:45 — 18:15", court: "Cancha 2", group: "Intermedios" },
    { date: "Mié, 9 Jul", time: "16:45 — 18:15", court: "Cancha 2", group: "Intermedios" },
  ],
  "student-valentina": [
    { date: "Lun, 30 Jun", time: "18:30 — 20:00", court: "Cancha 3", group: "Avanzados" },
    { date: "Mié, 2 Jul", time: "18:30 — 20:00", court: "Cancha 3", group: "Avanzados" },
  ],
  // Self-managed adult student (distinct from the children managed by representative)
  "student-self-1": [
    { date: "Lun, 30 Jun", time: "18:30 — 20:00", court: "Cancha 2", group: "Intermedios" },
    { date: "Mié, 2 Jul", time: "18:30 — 20:00", court: "Cancha 2", group: "Intermedios" },
    { date: "Lun, 7 Jul", time: "18:30 — 20:00", court: "Cancha 2", group: "Intermedios" },
    { date: "Mié, 9 Jul", time: "18:30 — 20:00", court: "Cancha 2", group: "Intermedios" },
  ],
};

// ---------------------------------------------------------------------------
// Membership plans — shown to pre‑enrollment (autogestionado) users
// ---------------------------------------------------------------------------

interface MembershipPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  frequency: string;
  benefits: string[];
  popular?: boolean;
}

const membershipPlans: MembershipPlan[] = [
  {
    id: "mensual",
    name: "Plan Mensual",
    price: "$85",
    period: "/mes",
    frequency: "2 sesiones/semana",
    benefits: [
      "Acceso a canchas en horario regular",
      "Evaluación técnica inicial",
      "Seguro deportivo básico",
    ],
  },
  {
    id: "trimestral",
    name: "Plan Trimestral",
    price: "$225",
    period: "/trimestre",
    frequency: "2 sesiones/semana",
    benefits: [
      "Acceso a canchas en horario regular",
      "Evaluación técnica inicial",
      "Seguro deportivo básico",
      "Reserva prioritaria",
    ],
    popular: true,
  },
  {
    id: "semestral",
    name: "Plan Semestral",
    price: "$420",
    period: "/semestre",
    frequency: "2 sesiones/semana",
    benefits: [
      "Acceso a canchas en horario regular",
      "Evaluación técnica inicial",
      "Seguro deportivo básico",
      "Reserva prioritaria",
      "2 pases de invitado al mes",
    ],
  },
  {
    id: "anual",
    name: "Plan Anual",
    price: "$780",
    period: "/año",
    frequency: "3 sesiones/semana",
    benefits: [
      "Acceso a canchas todo el año",
      "Evaluación técnica inicial y seguimiento",
      "Seguro deportivo completo",
      "Reserva prioritaria",
      "4 pases de invitado al mes",
      "Eventos y torneos exclusivos",
    ],
  },
];

/**
 * Demo students managed by the representative persona.
 * The self-managed persona only manages themselves.
 */
const demoStudentsByAccount: Record<string, DemoStudentInfo[]> = {
  // Representative managing multiple students
  "user-rep-1": [
    {
      id: "student-sofia",
      nombre: "Sofía Martínez",
      grupo: "Principiantes",
      scenarioData: { ...scenarioData.active },
      upcomingSessions: [...sessionsByStudent["student-sofia"]],
    },
    {
      id: "student-mateo",
      nombre: "Mateo Rodríguez",
      grupo: "Intermedios",
      scenarioData: { ...scenarioData.pending_validation },
      upcomingSessions: [...sessionsByStudent["student-mateo"]],
    },
    {
      id: "student-valentina",
      nombre: "Valentina López",
      grupo: "Avanzados",
      scenarioData: { ...scenarioData.expired },
      upcomingSessions: [...sessionsByStudent["student-valentina"]],
    },
  ],
  // Self-managed adult student (manages only themself — distinct identity from minors)
  "user-self-1": [
    {
      id: "student-self-1",
      nombre: "Martín Rodríguez",
      grupo: "Intermedios",
      scenarioData: { ...scenarioData.active },
      upcomingSessions: [...sessionsByStudent["student-self-1"]],
    },
  ],
};

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

const membershipConfig: Record<MembershipStatus, { label: string; badge: string }> = {
  activa: { label: "Activa", badge: "badge-success" },
  vencida: { label: "Vencida", badge: "badge-error" },
  suspendida: { label: "Suspendida", badge: "badge-error" },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; badge: string }> = {
  paid: { label: "Pagado", badge: "badge-success" },
  pending: { label: "Pendiente", badge: "badge-warning" },
  overdue: { label: "Vencido", badge: "badge-error" },
};

const proofStatusLabels: Record<ProofStatus, { label: string; icon: React.ReactNode }> = {
  not_uploaded: {
    label: "Pendiente de Pago",
    icon: <Clock size={14} strokeWidth={2} aria-hidden="true" />,
  },
  pending_validation: {
    label: "Pendiente de Validación",
    icon: <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />,
  },
  validado: {
    label: "Aprobado",
    icon: <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />,
  },
  rechazado: {
    label: "Rechazado / Vencido",
    icon: <XCircle size={14} strokeWidth={2} aria-hidden="true" />,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StudentPage(): React.ReactElement {
  const { session } = useAuth();
  const userId = session?.user?.id;

  /**
   * Determine portal mode based on which demo user is logged in.
   * - user-rep-1 (representante@cataclub.com): external representative managing multiple students.
   * - user-self-1 (autogestionado@cataclub.com): self-managed adult student.
   */
  const isRepresentative = userId === "user-rep-1";
  const isPreEnrollment = userId === "user-natural-1";
  const accountLabel = isRepresentative
    ? "Representante / Responsable de pago"
    : isPreEnrollment
      ? "Pre‑inscripción"
      : userId === "user-self-1"
        ? "Alumno autogestionado"
        : "Portal de Cuenta";

  const students = userId ? demoStudentsByAccount[userId] ?? [] : [];

  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id ?? "");
  const [demoScenario, setDemoScenario] = useState<DemoScenario>("active");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
    };
  }, []);

  const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  const selectedStudent =
    students.find((s) => s.id === selectedStudentId) ??
    students[0] ??
    {
      id: "empty",
      nombre: "",
      grupo: "",
      scenarioData: scenarioData.active,
      upcomingSessions: [],
    };

  // Use whatever state the scenario selector chose
  const scenario = scenarioData[demoScenario];
  const membershipInfo = membershipConfig[scenario.membership.status];
  const paymentInfo = paymentStatusConfig[scenario.payment.status];

  const proofStatus = getProofStatus(
    scenario.membership.status,
    scenario.payment.proofUploaded,
    scenario.payment.validated,
  );
  const proofInfo = proofStatusLabels[proofStatus];

  const activeSessions = selectedStudent?.upcomingSessions ?? [];

  function handleStudentChange(studentId: string): void {
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
      uploadTimeoutRef.current = null;
    }
    setSelectedStudentId(studentId);
    setSelectedFile(null);
    setDemoSubmitted(false);
    setDemoSubmitting(false);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleScenarioChange(scenario: DemoScenario): void {
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
      uploadTimeoutRef.current = null;
    }
    setDemoScenario(scenario);
    setSelectedFile(null);
    setDemoSubmitted(false);
    setDemoSubmitting(false);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setDemoSubmitted(false);
    setFileError(null);

    if (file) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setFileError(
          "Solo se permiten imágenes (JPEG, PNG, GIF, WebP) y archivos PDF.",
        );
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError("El archivo no debe superar los 5 MB.");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
    }
  }

  function handleDemoSubmit(): void {
    setDemoSubmitting(true);
    uploadTimeoutRef.current = setTimeout(() => {
      setDemoSubmitting(false);
      setDemoSubmitted(true);
      uploadTimeoutRef.current = null;
    }, 1500);
  }

  return (
    <ProtectedRoute allowedRoles={["responsable_pago"]}>
      <div>
        {/* Hero Banner */}
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-cata-border bg-cata-surface px-6 py-10 shadow-elevated sm:px-10 sm:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,26,26,0.05),transparent_50%)]" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
                <UserCircle size={14} strokeWidth={2} aria-hidden="true" />
                Área de Estudiantes
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-cata-text sm:text-4xl">
                Portal de Cuenta
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-cata-text/60">
                {isPreEnrollment
                  ? "Cuenta creada — aún no inscrito como alumno. Elija un plan y complete su registro."
                  : `${selectedStudent?.nombre ?? ""} — membresía, pagos y horario`}
              </p>
            </div>
            <span className="hidden rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 sm:inline-block">
              Demo
            </span>
          </div>
        </div>

        {/* Account type badge */}
        <div className="mb-4 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            isRepresentative
              ? "bg-blue-50 text-blue-700"
              : isPreEnrollment
                ? "bg-violet-50 text-violet-700"
                : "bg-emerald-50 text-emerald-700"
          }`}>
            {isRepresentative ? (
              <Building2 size={12} strokeWidth={1.5} aria-hidden="true" />
            ) : isPreEnrollment ? (
              <UserPlus size={12} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <GraduationCap size={12} strokeWidth={1.5} aria-hidden="true" />
            )}
            {accountLabel}
          </span>
          {isRepresentative && (
            <span className="text-xs text-cata-text/65">
              Gestiona {students.length} alumnos
            </span>
          )}
        </div>

        {isRepresentative && students.length > 1 && (
          <div className="mb-4">
            <label htmlFor="student-select" className="text-xs font-medium text-cata-text/45">
              Seleccionar alumno
            </label>
            <div className="relative mt-1 inline-block">
              <select
                id="student-select"
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="appearance-none rounded-xl border border-cata-border bg-cata-surface px-4 py-2 pr-10 text-sm font-medium text-cata-text shadow-sm transition-colors hover:border-cata-red/30 focus:border-cata-red/40 focus:outline-none focus:ring-2 focus:ring-cata-red/10"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} — {s.grupo}
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

        {/* Enrollment CTAs */}
        {(isRepresentative || (!isRepresentative && !isPreEnrollment)) && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {/* Representative: can add a dependent OR join as player */}
            {isRepresentative && (
              <>
                <Link
                  href="/student/enroll"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition-all duration-200 hover:bg-blue-100"
                >
                  <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
                  Agregar hijo/dependiente
                  <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
                </Link>
                <Link
                  href="/student/enroll?type=player"
                  className="inline-flex items-center gap-2 rounded-xl bg-cata-red/15 px-4 py-2.5 text-sm font-medium text-cata-red transition-all duration-200 hover:bg-cata-red/25"
                >
                  <GraduationCap size={16} strokeWidth={1.5} aria-hidden="true" />
                  Unirme como jugador
                  <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
                </Link>
              </>
            )}

            {/* Self-managed enrolled student: can add a dependent to become a representative too */}
            {!isRepresentative && !isPreEnrollment && (
              <Link
                href="/student/enroll?type=representative"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition-all duration-200 hover:bg-blue-100"
              >
                <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
                Inscribir hijo/dependiente
                <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

        {/* Pre‑enrollment view (natural / pre‑inscripción) */}
        {isPreEnrollment ? (
          <div className="mb-8">
            {/* Intro */}
            <div className="mb-6 rounded-2xl border border-cata-border bg-cata-bg p-6">
              <div className="mb-3 flex items-center gap-2">
                <UserPlus size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                <h2 className="text-lg font-bold text-cata-text">
                  Bienvenido a Cata Club
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-cata-text/65">
                Su cuenta está creada pero aún no está inscrito como alumno.
                Elija el plan de membresía que mejor se adapte a sus necesidades
                y complete su inscripción para comenzar a entrenar.
              </p>
              <p className="mt-3 text-xs leading-relaxed text-cata-text/45">
                Una vez inscrito, desde su portal podrá agregar hijos o
                dependientes si necesita gestionar las membresías de su familia.
              </p>
            </div>

            {/* Membership plan cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {membershipPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`card-hover flex flex-col p-5 sm:p-6 ${
                    plan.popular ? "ring-2 ring-cata-red/30" : ""
                  }`}
                >
                  {plan.popular && (
                    <span className="mb-3 self-start rounded-full bg-cata-red/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cata-red">
                      Popular
                    </span>
                  )}
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cata-red/15">
                    <ShieldCheck size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold text-cata-text">
                    {plan.name}
                  </h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-cata-text">
                      {plan.price}
                    </span>
                    <span className="text-sm text-cata-text/65">{plan.period}</span>
                  </div>
                  <p className="mt-1 text-xs text-cata-text/65">{plan.frequency}</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {plan.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2 text-xs text-cata-text/65">
                        <CheckCircle2 size={12} strokeWidth={2} className="mt-0.5 shrink-0 text-cata-state-ok" aria-hidden="true" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* CTA to enroll */}
            <div className="mt-8 text-center">
              <Link
                href="/student/enroll"
                className="btn-primary inline-flex items-center gap-2 shadow-soft"
              >
                <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
                Comenzar Inscripción
                <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </Link>
              <p className="mt-3 text-xs text-cata-text/65">
                El proceso toma solo unos minutos. No requiere ningún pago por adelantado.
              </p>
            </div>
          </div>
        ) : students.length === 0 ? (
          <div className="card p-6 text-center">
            <User size={32} strokeWidth={1.5} className="mx-auto mb-3 text-cata-text/20" aria-hidden="true" />
            <p className="text-sm text-cata-text/50">
              No se encontraron estudiantes asociados a esta cuenta.
            </p>
          </div>
        ) : (
          <>
            {/* Demo Scenario Selector (representative / enrolled view) */}
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                <p className="text-xs font-medium uppercase tracking-wider text-cata-text/45">
                  Estado de Demo
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(scenarioData) as DemoScenario[]).map((scenarioKey) => {
                  const isActive = demoScenario === scenarioKey;
                  return (
                    <button
                      key={scenarioKey}
                      onClick={() => handleScenarioChange(scenarioKey)}
                      className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-cata-red/15 text-cata-red ring-1 ring-cata-red/30"
                          : "bg-cata-bg text-cata-text/65 ring-1 ring-cata-border hover:bg-cata-border/60 hover:text-cata-text"
                      }`}
                    >
                      {scenarioLabels[scenarioKey]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Membership & Payment cards */}
            <div className="mb-8 grid gap-5 sm:grid-cols-2">
              {/* Membership */}
              <div className="card-hover p-5 sm:p-6">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                    <ShieldCheck size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-cata-text/65">Membresía</p>
                    <p className="text-lg font-bold tracking-tight text-cata-text">
                      {scenario.membership.type}
                    </p>
                  </div>
                  <span className={membershipInfo.badge}>{membershipInfo.label}</span>
                </div>
                <div className="space-y-2 text-sm text-cata-text/65">
                  <div className="flex justify-between">
                    <span>Período</span>
                    <span className="font-medium text-cata-text">{scenario.membership.period}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inicio</span>
                    <span className="font-medium text-cata-text">{scenario.membership.startDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fin</span>
                    <span className="font-medium text-cata-text">{scenario.membership.endDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cuota</span>
                    <span className="font-medium text-cata-text">{scenario.membership.fee}</span>
                  </div>
                </div>
              </div>

              {/* Payment / Upload Proof */}
              <div className="card-hover p-5 sm:p-6">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                    <CreditCard size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-cata-text/65">Pago Actual</p>
                    <p className="text-lg font-bold tracking-tight text-cata-text">
                      {scenario.membership.period}
                    </p>
                  </div>
                  <span className={paymentInfo.badge}>{paymentInfo.label}</span>
                </div>
                <div className="space-y-2 text-sm text-cata-text/65">
                  <div className="flex justify-between">
                    <span>Método de Pago</span>
                    <span className="font-medium text-cata-text">{scenario.payment.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pagado el</span>
                    <span className="font-medium text-cata-text">{scenario.payment.paidOn}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Estado del Comprobante</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${getProofStatusColorClass(proofStatus)}`}>
                      {proofInfo.icon}
                      {proofInfo.label}
                    </span>
                  </div>
                </div>

                {/* Upload Proof Section */}
                <div className="mt-5 rounded-xl border-2 border-dashed border-cata-border bg-cata-bg p-5">
                  {scenario.payment.validated ? (
                    /* Already validated — read-only confirmation */
                    <div className="flex items-center gap-2 rounded-lg bg-cata-state-ok/10 px-3 py-2 text-xs text-cata-state-ok">
                      <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
                      Comprobante registrado y validado
                    </div>
                  ) : scenario.payment.proofUploaded && demoScenario !== "expired" ? (
                    /* Uploaded but not yet validated — read-only pending message */
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
                      Comprobante enviado, pendiente de validación por administración
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cata-text">
                        <Upload size={14} strokeWidth={1.5} aria-hidden="true" />
                        {demoScenario === "expired" ? "Renovar Membresía" : "Subir Comprobante de Pago"}
                      </div>

                      {demoScenario === "expired" && (
                        <p className="mb-3 text-xs text-cata-text/65">
                          Su membresía está vencida. Suba el comprobante del nuevo período para renovarla.
                        </p>
                      )}

                      {/* File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf,.pdf"
                        onChange={handleFileChange}
                        aria-label="Seleccionar comprobante de pago (solo imágenes y PDF, máximo 5 MB)"
                        className="block w-full text-xs text-cata-text/65 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-cata-red/15 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-cata-red hover:file:bg-cata-red/25"
                      />

                      {/* File validation error */}
                      {fileError && (
                        <p className="mt-1 text-xs text-cata-red" role="alert">
                          {fileError}
                        </p>
                      )}

                      {/* Selected file info */}
                      {selectedFile && !fileError && (
                        <div className="mt-2 flex items-center gap-2 rounded-lg bg-cata-bg px-3 py-2 text-xs text-cata-text/65">
                          <FileText size={14} strokeWidth={1.5} className="shrink-0 text-cata-red" aria-hidden="true" />
                          <span className="truncate font-medium text-cata-text">
                            {selectedFile.name}
                          </span>
                          <span className="shrink-0 text-cata-text/45">
                            ({formatFileSize(selectedFile.size)})
                          </span>
                        </div>
                      )}

                      {/* Demo submit button */}
                      <button
                        type="button"
                        onClick={handleDemoSubmit}
                        disabled={!selectedFile || !!fileError || demoSubmitting || demoSubmitted}
                        className="btn-primary mt-3 w-full shadow-soft text-xs"
                      >
                        {demoSubmitting ? (
                          "Subiendo..."
                        ) : (
                          <>
                            <Upload size={13} strokeWidth={2} aria-hidden="true" />
                            Subir Comprobante (Demo)
                          </>
                        )}
                      </button>

                      {/* Demo confirmation / change file after simulated upload */}
                      {demoSubmitted && selectedFile && !demoSubmitting && (
                        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          <p className="flex items-center gap-1.5 font-medium">
                            <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
                            Comprobante seleccionado en modo demo
                          </p>
                          <p className="mt-1 text-amber-700/80">
                            No se almacenó ningún archivo. El envío real se habilitará cuando
                            el backend esté conectado.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setDemoSubmitted(false);
                              setSelectedFile(null);
                              setDemoSubmitting(false);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="mt-2 text-xs font-medium text-amber-700 underline hover:text-amber-800"
                          >
                            Cambiar archivo
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Próximas Sesiones (compact) */}
            <section className="mb-8">
              <div className="mb-4 flex items-center gap-2">
                <Calendar size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                <h2 className="text-lg font-bold text-cata-text">
                  Próximas Sesiones {selectedStudent && `— ${selectedStudent.nombre}`}
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {activeSessions.map((session) => (
                  <div
                    key={`${session.date}-${session.time}`}
                    className="card-hover p-4 sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                        <Calendar size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-cata-text">{session.date}</p>
                        <p className="text-sm text-cata-text/65">{session.time}</p>
                        <p className="mt-1 text-xs text-cata-text/40">
                          {session.court} &middot; {session.group}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Domain model info card (educational / transparent) */}
        <div className="mb-8 rounded-2xl border border-cata-border bg-cata-bg p-6">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-sm font-bold text-cata-text">Modelo de dominio (Demo)</h3>
          </div>
          <p className="text-sm leading-relaxed text-cata-text/65">
            {isRepresentative ? (
              <>
                Este portal corresponde a un <strong className="text-cata-text">responsable de pago tipo representante</strong>.
                Una misma persona (ej. un padre/madre) puede gestionar las membresías y pagos
                de <strong className="text-cata-text">varios alumnos</strong>. Cada alumno tiene su membresía, sesiones y
                comprobantes asociados.
              </>
            ) : isPreEnrollment ? (
              <>
                Esta cuenta está en estado de <strong className="text-cata-text">pre‑inscripción</strong>: la persona creó su
                cuenta de acceso pero aún no se ha inscrito como alumno del club. Al completar la
                inscripción, la misma persona será el titular de la cuenta y el alumno que entrena
                (<strong className="text-cata-text">jugador</strong>). Las membresías y pagos se gestionan
                directamente desde el portal.
              </>
            ) : (
              <>
                Portal de cuenta genérico. Seleccione una cuenta de demostración para ver el
                comportamiento específico.
              </>
            )}
          </p>
        </div>

        {/* Demo honesty footer */}
        <p className="mt-10 text-center text-xs text-cata-text/30">
          El portal de cuenta muestra solo datos de demostración. No se almacenan registros
          reales de membresía, pagos, horarios o salud. Listo para la integración con la API del backend.
        </p>
      </div>
    </ProtectedRoute>
  );
}
