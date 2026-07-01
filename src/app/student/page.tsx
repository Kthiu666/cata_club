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
  User,
  ChevronDown,
  GraduationCap,
  Building2,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { getProofStatus, formatFileSize } from "./proof-utils";
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
  nivel: string;
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

/** Sessions for each demo student. */
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
      nivel: "Principiante",
      scenarioData: { ...scenarioData.active },
      upcomingSessions: [...sessionsByStudent["student-sofia"]],
    },
    {
      id: "student-mateo",
      nombre: "Mateo Rodríguez",
      nivel: "Intermedio",
      scenarioData: { ...scenarioData.pending_validation },
      upcomingSessions: [...sessionsByStudent["student-mateo"]],
    },
    {
      id: "student-valentina",
      nombre: "Valentina López",
      nivel: "Avanzado",
      scenarioData: { ...scenarioData.expired },
      upcomingSessions: [...sessionsByStudent["student-valentina"]],
    },
  ],
  // Self-managed adult student (manages only themself — distinct identity from minors)
  "user-self-1": [
    {
      id: "student-self-1",
      nombre: "Martín Rodríguez",
      nivel: "Intermedio",
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
    icon: <Clock size={14} strokeWidth={2} />,
  },
  pending_validation: {
    label: "Pendiente de Validación",
    icon: <AlertTriangle size={14} strokeWidth={2} />,
  },
  approved: {
    label: "Aprobado",
    icon: <CheckCircle2 size={14} strokeWidth={2} />,
  },
  rejected: {
    label: "Rechazado / Vencido",
    icon: <XCircle size={14} strokeWidth={2} />,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StudentPage() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  /**
   * Determine portal mode based on which demo user is logged in.
   * - user-rep-1 (representante@cataclub.com): external representative managing multiple students.
   * - user-self-1 (autogestionado@cataclub.com): self-managed adult student.
   */
  const isRepresentative = userId === "user-rep-1";
  const isSelfManaged = userId === "user-self-1";
  const accountLabel = isRepresentative
    ? "Representante / Responsable de pago"
    : isSelfManaged
      ? "Alumno autogestionado"
      : "Portal de Cuenta";

  const students = userId
    ? demoStudentsByAccount[userId] ?? demoStudentsByAccount["user-rep-1"]
    : demoStudentsByAccount["user-rep-1"];

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

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? students[0];

  // Apply the demo scenario on top of the student's base data (clone to avoid mutation)
  const displayScenario = {
    ...selectedStudent.scenarioData,
    ...scenarioData[demoScenario],
  };
  // Override with whatever state the scenario selector chose
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

  function handleStudentChange(studentId: string) {
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

  function handleScenarioChange(scenario: DemoScenario) {
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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

  function handleDemoSubmit() {
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
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-cata-charcoal sm:text-3xl">
            Portal de Cuenta
          </h1>
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700">
            Demo
          </span>
        </div>

        {/* Account type badge */}
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            isRepresentative
              ? "bg-blue-50 text-blue-700"
              : "bg-emerald-50 text-emerald-700"
          }`}>
            {isRepresentative ? (
              <Building2 size={12} strokeWidth={1.5} />
            ) : (
              <GraduationCap size={12} strokeWidth={1.5} />
            )}
            {accountLabel}
          </span>
          {isRepresentative && (
            <span className="text-xs text-cata-gray">
              Gestiona {students.length} alumnos
            </span>
          )}
        </div>

        {isRepresentative && students.length > 1 && (
          <div className="mt-3">
            <label htmlFor="student-select" className="text-xs font-medium text-cata-gray-light">
              Seleccionar alumno
            </label>
            <div className="relative mt-1 inline-block">
              <select
                id="student-select"
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="appearance-none rounded-xl border border-cata-stone/60 bg-white px-4 py-2 pr-10 text-sm font-medium text-cata-charcoal shadow-sm transition-colors hover:border-cata-stone focus:border-cata-red/40 focus:outline-none focus:ring-2 focus:ring-cata-red/10"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} ({s.nivel})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                strokeWidth={1.5}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                aria-hidden="true"
              />
            </div>
          </div>
        )}

        <p className="mt-2 text-sm text-cata-gray">
          {selectedStudent?.nombre ?? ""} — membresía, pagos y horario
        </p>
      </div>

      {/* ── Student Enrollment CTA ── */}
      {isRepresentative && (
        <div className="mb-6">
          <Link
            href="/student/enroll"
            className="inline-flex items-center gap-2 rounded-xl bg-cata-red/8 px-4 py-2.5 text-sm font-medium text-cata-red transition-all duration-200 hover:bg-cata-red/15"
          >
            <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
            Inscribirse
            <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* ── Demo Scenario Selector ── */}
      <div className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-cata-gray-light">
          Estado de Demo
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(scenarioData) as DemoScenario[]).map((scenarioKey) => {
            const isActive = demoScenario === scenarioKey;
            return (
              <button
                key={scenarioKey}
                onClick={() => handleScenarioChange(scenarioKey)}
                className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-cata-red/8 text-cata-red ring-1 ring-cata-red/30"
                    : "bg-white text-cata-gray ring-1 ring-cata-stone/50 hover:bg-cata-warm hover:text-cata-charcoal"
                }`}
              >
                {scenarioLabels[scenarioKey]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Membership & Payment cards ── */}
      <div className="mb-8 grid gap-5 sm:grid-cols-2">
        {/* Membership */}
        <div className="card-hover p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/8">
              <ShieldCheck size={18} strokeWidth={1.5} className="text-cata-red" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-cata-gray">Membresía</p>
              <p className="text-lg font-bold tracking-tight text-cata-charcoal">
                {scenario.membership.type}
              </p>
            </div>
            <span className={membershipInfo.badge}>{membershipInfo.label}</span>
          </div>
          <div className="space-y-2 text-sm text-cata-gray">
            <div className="flex justify-between">
              <span>Período</span>
              <span className="font-medium text-cata-charcoal">{scenario.membership.period}</span>
            </div>
            <div className="flex justify-between">
              <span>Inicio</span>
              <span className="font-medium text-cata-charcoal">{scenario.membership.startDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Fin</span>
              <span className="font-medium text-cata-charcoal">{scenario.membership.endDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Cuota</span>
              <span className="font-medium text-cata-charcoal">{scenario.membership.fee}</span>
            </div>
          </div>
        </div>

        {/* Payment / Upload Proof */}
        <div className="card-hover p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/8">
              <CreditCard size={18} strokeWidth={1.5} className="text-cata-red" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-cata-gray">Pago Actual</p>
              <p className="text-lg font-bold tracking-tight text-cata-charcoal">
                {scenario.membership.period}
              </p>
            </div>
            <span className={paymentInfo.badge}>{paymentInfo.label}</span>
          </div>
          <div className="space-y-2 text-sm text-cata-gray">
            <div className="flex justify-between">
              <span>Método de Pago</span>
              <span className="font-medium text-cata-charcoal">{scenario.payment.method}</span>
            </div>
            <div className="flex justify-between">
              <span>Pagado el</span>
              <span className="font-medium text-cata-charcoal">{scenario.payment.paidOn}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Estado del Comprobante</span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                proofStatus === "not_uploaded" ? "text-amber-600" :
                proofStatus === "pending_validation" ? "text-amber-600" :
                proofStatus === "approved" ? "text-emerald-600" :
                "text-cata-red"
              }`}>
                {proofInfo.icon}
                {proofInfo.label}
              </span>
            </div>
          </div>

          {/* ── Upload Proof Section ── */}
          <div className="mt-5 rounded-xl border-2 border-dashed border-cata-stone/70 bg-cata-warm/50 p-5">
            {scenario.payment.validated ? (
              /* Already validated — read-only confirmation */
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <CheckCircle2 size={14} strokeWidth={2} />
                Comprobante registrado y validado
              </div>
            ) : scenario.payment.proofUploaded && demoScenario !== "expired" ? (
              /* Uploaded but not yet validated — read-only pending message */
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle size={14} strokeWidth={2} />
                Comprobante enviado, pendiente de validación por administración
              </div>
            ) : (
              <>
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-cata-charcoal">
                  <Upload size={14} strokeWidth={1.5} />
                  {demoScenario === "expired" ? "Renovar Membresía" : "Subir Comprobante de Pago"}
                </p>

                {demoScenario === "expired" && (
                  <p className="mb-3 text-xs text-cata-gray">
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
                  className="block w-full text-xs text-cata-gray file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-cata-red/8 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-cata-red hover:file:bg-cata-red/15"
                />

                {/* File validation error */}
                {fileError && (
                  <p className="mt-1 text-xs text-cata-red" role="alert">
                    {fileError}
                  </p>
                )}

                {/* Selected file info */}
                {selectedFile && !fileError && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-cata-gray">
                    <FileText size={14} strokeWidth={1.5} className="shrink-0 text-cata-red" />
                    <span className="truncate font-medium text-cata-charcoal">
                      {selectedFile.name}
                    </span>
                    <span className="shrink-0 text-cata-gray-light">
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
                      <Upload size={13} strokeWidth={2} />
                      Subir Comprobante (Demo)
                    </>
                  )}
                </button>

                {/* Demo confirmation / change file after simulated upload */}
                {demoSubmitted && selectedFile && !demoSubmitting && (
                  <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <p className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle size={12} strokeWidth={2} />
                      Comprobante seleccionado en modo demo
                    </p>
                    <p className="mt-1 text-amber-600/80">
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

      {/* ── Próximas Sesiones (compact) ── */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-cata-charcoal">
          Próximas Sesiones {selectedStudent && `— ${selectedStudent.nombre}`}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {activeSessions.map((session) => (
            <div
              key={`${session.date}-${session.time}`}
              className="card-hover p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cata-warm">
                  <Calendar size={16} strokeWidth={1.5} className="text-cata-gray" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-cata-charcoal">{session.date}</p>
                  <p className="text-sm text-cata-gray">{session.time}</p>
                  <p className="mt-1 text-xs text-cata-gray/60">
                    {session.court} &middot; {session.group}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Domain model info card (educational / transparent) ── */}
      <div className="mb-8 rounded-xl border border-cata-stone/50 bg-white p-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cata-gray-light">
          Modelo de dominio (Demo)
        </h3>
        <p className="text-xs leading-relaxed text-cata-gray">
          {isRepresentative ? (
            <>
              Este portal corresponde a un <strong>responsable de pago tipo representante</strong>.
              Una misma persona (ej. un padre/madre) puede gestionar las membresías y pagos
              de <strong>varios alumnos</strong>. Cada alumno tiene su membresía, sesiones y
              comprobantes asociados.
            </>
          ) : (
            <>
              Este portal corresponde a un <strong>alumno autogestionado</strong> (mayor de edad).
              La misma persona es el titular de la cuenta y el alumno que entrena.
              Gestiona su propia membresía y pagos.
            </>
          )}
        </p>
      </div>

      {/* ── Demo honesty footer ── */}
      <p className="mt-10 text-center text-xs text-cata-gray/40">
        El portal de cuenta muestra solo datos de demostración. No se almacenan registros
        reales de membresía, pagos, horarios o salud. Listo para la integración con la API del backend.
      </p>
    </div>
    </ProtectedRoute>
  );
}
