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
  buildMemberStats,
  formatCurrency,
  formatDate,
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
  type MemberAccount,
  type MemberStudentSummary,
  type PaymentStatus,
} from "./members-utils";

// ---------------------------------------------------------------------------
// Payment status icon helper
// ---------------------------------------------------------------------------

function PaymentStatusIcon({ estado }: { estado: PaymentStatus }) {
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
  highlight?: boolean;
}

function StatCard({ icon, label, value, highlight }: StatCardProps) {
  return (
    <div className="card-hover p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            highlight ? "bg-cata-red/8" : "bg-cata-warm"
          }`}
        >
          {icon}
        </div>
      </div>
      <p className="text-sm font-medium text-cata-gray">{label}</p>
      <p className="mt-0.5 text-3xl font-bold tracking-tight text-cata-charcoal">
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Student detail row (expanded within an account)
// ---------------------------------------------------------------------------

function StudentRow({ student }: { student: MemberStudentSummary }) {
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
    <tr id={`student-detail-${student.id}`} className="border-t border-cata-stone/30 bg-cata-warm/30">
      <td colSpan={7} className="px-4 py-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Student identity */}
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-cata-charcoal">
              <User size={14} strokeWidth={1.5} aria-hidden="true" />
              {student.nombres} {student.apellidos}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-cata-gray">
              {nivelDisplay ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-cata-warm px-2 py-0.5">
                  <GraduationCap size={10} strokeWidth={1.5} aria-hidden="true" />
                  {nivelDisplay}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
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
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-cata-gray/60">
              Membresía
            </p>
            {student.membresia ? (
              <>
                <span className={membershipBadge}>{membershipLabel}</span>
                <p className="mt-1 text-xs text-cata-gray">
                  {student.membresia.tipo === "mensual"
                    ? "Mensual"
                    : student.membresia.tipo === "trimestral"
                      ? "Trimestral"
                      : "Anual"}{" "}
                  &middot;{" "}
                  {formatMembershipPeriod(
                    student.membresia.fechaInicio,
                    student.membresia.fechaFin,
                  )}
                </p>
                <p className="text-xs text-cata-gray">
                  {formatCurrency(student.membresia.monto)}
                </p>
              </>
            ) : (
              <span className="text-xs text-cata-gray/60">Sin membresía registrada</span>
            )}
          </div>

          {/* Last payment */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-cata-gray/60">
              Último pago
            </p>
            {student.ultimoPago ? (
              <>
                <span className={paymentBadge}>
                  <PaymentStatusIcon estado={student.ultimoPago.estado} />
                  {paymentLabel}
                </span>
                <p className="mt-1 text-xs text-cata-gray">
                  {formatCurrency(student.ultimoPago.monto)} &middot;{" "}
                  {student.ultimoPago.periodo}
                </p>
              </>
            ) : (
              <span className="text-xs text-cata-gray/60">No registrado</span>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-start justify-end">
            {student.activo ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 size={11} strokeWidth={2} aria-hidden="true" />
                Activo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-cata-gray/60">
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

function AccountRow({
  account,
  defaultOpen,
}: {
  account: MemberAccount;
  defaultOpen: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const activeCount = countActiveStudents(account);
  const statusBadge = getAccountStatusBadge(account);

  return (
    <>
      <tr className="transition-colors hover:bg-cata-warm/60">
        <td className="px-4 py-3.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="mr-2 inline-flex items-center text-cata-gray"
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cata-red/8">
              {account.tipo === "representante" ? (
                <Building2 size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              ) : (
                <GraduationCap size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="font-medium text-cata-charcoal">
                {account.nombres} {account.apellidos}
              </p>
              <p className="text-xs text-cata-gray">
                {PAYER_TYPE_LABELS[account.tipo]}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5 text-xs text-cata-gray">
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
          <span className="text-sm font-medium text-cata-charcoal">
            {account.alumnos.length}
          </span>
        </td>
        <td className="px-4 py-3.5 text-center">
          <span className="text-sm font-medium text-cata-charcoal">
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

export default function MembersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const accounts = MOCK_MEMBER_ACCOUNTS;
  const stats = buildMemberStats(accounts);

  const filteredAccounts = filterAccounts(accounts, searchTerm);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div>
        {/* ══ Header ══ */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cata-red/10">
              <Users
                size={20}
                strokeWidth={1.5}
                className="text-cata-red"
                aria-hidden="true"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-cata-charcoal">
                Gestionar Miembros
              </h1>
              <p className="text-sm text-cata-gray">
                Responsables de pago, alumnos y resumen de membresías
              </p>
            </div>
          </div>
        </div>

        {/* ══ Demo indicator ══ */}
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
          <span className="font-medium">Demo</span> &mdash; Los datos de
          miembros son simulados con información local en memoria. No hay
          integración con un backend real. Los datos se reinician al recargar
          la página o reiniciar el servidor.
        </div>

        {/* ══ Stats grid ══ */}
        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users size={18} strokeWidth={1.5} className="text-cata-gray" aria-hidden="true" />}
            label="Cuentas"
            value={stats.totalAccounts}
          />
          <StatCard
            icon={<UserCheck size={18} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
            label="Alumnos"
            value={stats.totalStudents}
            highlight
          />
          <StatCard
            icon={<ShieldCheck size={18} strokeWidth={1.5} className="text-emerald-600" aria-hidden="true" />}
            label="Membresías activas"
            value={stats.activeMemberships}
          />
          <StatCard
            icon={<Clock size={18} strokeWidth={1.5} className="text-amber-600" aria-hidden="true" />}
            label="Pagos pendientes"
            value={stats.pendingPayments}
          />
        </div>

        {/* ══ Search ══ */}
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search
              size={14}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
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

        {/* ══ Members table ══ */}
        {filteredAccounts.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cata-stone/60 bg-cata-warm text-xs font-medium uppercase tracking-wider text-cata-gray">
                    <th className="w-10 px-4 py-3 font-medium" />
                    <th className="px-4 py-3 font-medium">Responsable de pago</th>
                    <th className="px-4 py-3 font-medium">Contacto</th>
                    <th className="px-4 py-3 text-center font-medium">Alumnos</th>
                    <th className="px-4 py-3 text-center font-medium">Activos</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cata-stone/40">
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
              size={40}
              strokeWidth={1}
              className="mb-3 text-cata-stone"
              aria-hidden="true"
            />
            <p className="text-sm text-cata-gray">
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

        {/* ══ Domain info card ══ */}
        <div className="mt-8 rounded-xl border border-cata-stone/50 bg-white p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cata-gray-light">
            Modelo de dominio (Demo)
          </h3>
          <p className="text-xs leading-relaxed text-cata-gray">
            Cada <strong>responsable de pago</strong> (titular de cuenta) gestiona
            uno o más alumnos. Un representante (ej. padre/madre) puede gestionar
            varios alumnos. Un alumno autogestionado es su propio responsable de pago.
            El <strong>nivel técnico</strong> lo lleva el grupo asignado, no el alumno.
            Los datos de membresía, grupos y pagos son simulados.
          </p>
        </div>

        {/* ══ Demo footer ══ */}
        <p className="mt-8 text-center text-xs text-cata-gray/40">
          Los datos de miembros son de demostración. No se almacenan registros reales.
          Listo para la integración con la API del backend.
        </p>
      </div>
    </ProtectedRoute>
  );
}
