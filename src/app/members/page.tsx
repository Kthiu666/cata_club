/**
 * Gestionar Miembros — Admin overview of responsible payers and their students.
 *
 * Displays all MemberAccount records (account owners / responsible payers)
 * with their associated students. Shows membership status, payment summary,
 * and contact/identity information for each.
 *
 * Frontend-only mock — no backend integration. Data resets on server restart.
 * Pattern follows the existing payments/page.tsx and student/page.tsx.
 */

"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Users,
  UserCheck,
  Clock,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronRight,
  User,
  Phone,
  Mail,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";
import {
  MOCK_MEMBER_ACCOUNTS,
  MOCK_GRUPOS,
} from "@/mocks/members";
import {
  buildMemberStats,
  formatMembershipPeriod,
  countActiveStudents,
  filterAccounts,
  getAccountStatusBadge,
  getNivelLabelFromGrupo,
  MEMBERSHIP_STATUS_LABELS,
  MEMBERSHIP_STATUS_BADGE,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE,
  PAYER_TYPE_LABELS,
  MEMBERSHIP_TYPE_LABELS,
  type MemberAccount,
  type MemberStudentSummary,
  type PaymentStatus,
} from "./members-utils";
import { formatCurrency, formatDate } from "@/lib/format-utils";

// ---------------------------------------------------------------------------
// Payment status icon helper
// ---------------------------------------------------------------------------

interface PaymentStatusIconProps {
  estado: PaymentStatus;
}

function PaymentStatusIcon({ estado }: PaymentStatusIconProps): React.ReactElement | null {
  switch (estado) {
    case "aprobado":
      return <CheckCircle2 size={12} strokeWidth={2} aria-hidden="true" />;
    case "pendiente_validacion":
      return <Clock size={12} strokeWidth={2} aria-hidden="true" />;
    case "rechazado":
      return <XCircle size={12} strokeWidth={2} aria-hidden="true" />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function StatCard({ icon, label, value }: StatCardProps): React.ReactElement {
  return (
    <div className="card-hover p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cata-red/15">
          {icon}
        </div>
      </div>
      <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Student detail row (expanded within an account)
// ---------------------------------------------------------------------------

interface StudentRowProps {
  student: MemberStudentSummary;
}

function StudentRow({ student }: StudentRowProps): React.ReactElement {
  const membershipLabel = student.membresia
    ? MEMBERSHIP_STATUS_LABELS[student.membresia.estado]
    : "Sin membresía";
  const membershipBadge = student.membresia
    ? MEMBERSHIP_STATUS_BADGE[student.membresia.estado]
    : "badge-neutral";

  const paymentLabel = student.ultimoPago
    ? PAYMENT_STATUS_LABELS[student.ultimoPago.estado]
    : "Sin pagos";
  const paymentBadge = student.ultimoPago
    ? PAYMENT_STATUS_BADGE[student.ultimoPago.estado]
    : "badge-neutral";

  const nivelDisplay = getNivelLabelFromGrupo(student.grupoId, MOCK_GRUPOS);

  return (
    <tr id={`student-detail-${student.id}`} className="border-t border-cata-border bg-cata-bg/60">
      <td colSpan={7} className="px-4 py-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Student identity */}
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-cata-text">
              <User size={14} strokeWidth={1.5} aria-hidden="true" />
              {student.nombres} {student.apellidos}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-cata-text/65">
              {nivelDisplay ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-cata-bg px-2 py-0.5">
                  <GraduationCap size={10} strokeWidth={1.5} aria-hidden="true" />
                  {nivelDisplay}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/20 px-2 py-0.5 text-amber-400">
                  Sin grupo asignado
                </span>
              )}
              {student.fechaNacimiento && (
                <span>
                  Nac.: {formatDate(student.fechaNacimiento)}
                </span>
              )}
            </div>
          </div>

          {/* Membership */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-cata-text/40">
              Membresía
            </p>
            {student.membresia ? (
              <>
                <span className={membershipBadge}>{membershipLabel}</span>
                <p className="mt-1 text-xs text-cata-text/65">
                  {MEMBERSHIP_TYPE_LABELS[student.membresia.tipo]}{" "}
                  &middot;{" "}
                  {formatMembershipPeriod(
                    student.membresia.fechaInicio,
                    student.membresia.fechaFin,
                  )}
                </p>
                <p className="text-xs text-cata-text/65">
                  {formatCurrency(student.membresia.monto)}
                </p>
              </>
            ) : (
              <span className="text-xs text-cata-text/40">Sin membresía registrada</span>
            )}
          </div>

          {/* Last payment */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-cata-text/40">
              Último pago
            </p>
            {student.ultimoPago ? (
              <>
                <span className={paymentBadge}>
                  <PaymentStatusIcon estado={student.ultimoPago.estado} />
                  {paymentLabel}
                </span>
                <p className="mt-1 text-xs text-cata-text/65">
                  {formatCurrency(student.ultimoPago.monto)} &middot;{" "}
                  {student.ultimoPago.periodo}
                </p>
              </>
            ) : (
              <span className="text-xs text-cata-text/40">No registrado</span>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-start justify-end">
            {student.activo ? (
              <span className="inline-flex items-center gap-1 text-xs text-cata-state-ok">
                <CheckCircle2 size={11} strokeWidth={2} aria-hidden="true" />
                Activo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-cata-text/40">
                <XCircle size={11} strokeWidth={2} aria-hidden="true" />
                Inactivo
              </span>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Account row (collapsible)
// ---------------------------------------------------------------------------

interface AccountRowProps {
  account: MemberAccount;
  defaultOpen: boolean;
}

function AccountRow({
  account,
  defaultOpen,
}: AccountRowProps): React.ReactElement {
  const [expanded, setExpanded] = useState(defaultOpen);
  const activeCount = countActiveStudents(account);
  const statusBadge = getAccountStatusBadge(account);

  return (
    <>
      <tr className="transition-colors hover:bg-cata-bg">
        <td className="px-4 py-3.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="mr-2 inline-flex items-center text-cata-text/65"
            aria-label={expanded ? "Contraer" : "Expandir"}
            aria-expanded={expanded}
            aria-controls={account.alumnos.map((a) => `student-detail-${a.id}`).join(" ")}
          >
            {expanded ? (
              <ChevronDown size={14} strokeWidth={1.5} />
            ) : (
              <ChevronRight size={14} strokeWidth={1.5} />
            )}
          </button>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cata-red/15">
              {account.tipo === "representante" ? (
                <Building2 size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              ) : (
                <GraduationCap size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="font-medium text-cata-text">
                {account.nombres} {account.apellidos}
              </p>
              <p className="text-xs text-cata-text/65">
                {PAYER_TYPE_LABELS[account.tipo]}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5 text-xs text-cata-text/65">
          <div className="flex items-center gap-1.5">
            <Mail size={11} strokeWidth={1.5} aria-hidden="true" />
            {account.email}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Phone size={11} strokeWidth={1.5} aria-hidden="true" />
            {account.telefono}
          </div>
        </td>
        <td className="px-4 py-3.5 text-center">
          <span className="text-sm font-medium text-cata-text">
            {account.alumnos.length}
          </span>
        </td>
        <td className="px-4 py-3.5 text-center">
          <span className="text-sm font-medium text-cata-text">
            {activeCount}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <span className={`badge ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </td>
      </tr>
      {expanded &&
        account.alumnos.map((alumno) => (
          <StudentRow key={alumno.id} student={alumno} />
        ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function MembersPage(): React.ReactElement {
  const [searchTerm, setSearchTerm] = useState("");
  const accounts = MOCK_MEMBER_ACCOUNTS;
  const stats = buildMemberStats(accounts);

  const filteredAccounts = filterAccounts(accounts, searchTerm);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div>
        {/* Hero Banner */}
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-cata-border bg-cata-surface px-6 py-10 shadow-elevated sm:px-10 sm:py-12">
          <div className="absolute inset-0 bg-logo-glow" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
              <Users size={14} strokeWidth={2} aria-hidden="true" />
              Gestión de Miembros
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-cata-text sm:text-4xl">
              Miembros del Club
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-cata-text/60">
              Responsables de pago, alumnos y resumen de membresías. Administre cuentas,
              estudiantes y estados de membresía desde un solo lugar.
            </p>
          </div>
        </div>

        {/* Demo badge */}
        <div className="mb-6 flex items-center gap-2">
          <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Demo
          </span>
          <span className="text-xs text-cata-text/40">
            Los datos de miembros son simulados con información local en memoria
          </span>
        </div>

        {/* Stats grid */}
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-lg font-bold text-cata-text">Resumen</h2>
        </div>
        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
            label="Cuentas"
            value={stats.totalAccounts}
          />
          <StatCard
            icon={<UserCheck size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
            label="Alumnos"
            value={stats.totalStudents}
          />
          <StatCard
            icon={<ShieldCheck size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
            label="Membresías activas"
            value={stats.activeMemberships}
          />
          <StatCard
            icon={<Clock size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
            label="Pagos pendientes"
            value={stats.pendingPayments}
          />
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search
              size={14}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="input-field pl-9"
              aria-label="Buscar miembros"
            />
          </div>
        </div>

        {/* Members table */}
        {filteredAccounts.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                    <th className="w-10 px-4 py-3 font-medium" />
                    <th className="px-4 py-3 font-medium">Responsable de pago</th>
                    <th className="px-4 py-3 font-medium">Contacto</th>
                    <th className="px-4 py-3 text-center font-medium">Alumnos</th>
                    <th className="px-4 py-3 text-center font-medium">Activos</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cata-border">
                  {filteredAccounts.map((account, index) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      defaultOpen={index === 0 && filteredAccounts.length === 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="card flex flex-col items-center py-16 text-center">
            <Users
              size={32}
              strokeWidth={1.5}
              className="mb-3 text-cata-text/20"
              aria-hidden="true"
            />
            <p className="text-sm text-cata-text/50">
              {searchTerm
                ? "No se encontraron miembros con ese criterio de búsqueda."
                : "Aún no hay miembros registrados."}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="btn-ghost mt-3 text-xs"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}

        {/* Domain info card */}
        <div className="card mt-8 p-6">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-sm font-bold text-cata-text">Modelo de dominio (Demo)</h3>
          </div>
          <p className="text-sm leading-relaxed text-cata-text/65">
            Cada <strong className="text-cata-text">responsable de pago</strong> (titular de cuenta) gestiona
            uno o más alumnos. Un representante (ej. padre/madre) puede gestionar
            varios alumnos. Un alumno autogestionado es su propio responsable de pago.
            El <strong className="text-cata-text">nivel técnico</strong> lo lleva el grupo asignado, no el alumno.
            Los datos de membresía, grupos y pagos son simulados.
          </p>
        </div>

        {/* Demo footer */}
        <p className="mt-8 text-center text-xs text-cata-text/30">
          Los datos de miembros son de demostración. No se almacenan registros reales.
          Listo para la integración con la API del backend.
        </p>
      </div>
    </ProtectedRoute>
  );
}
