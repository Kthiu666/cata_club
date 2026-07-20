/**
 * Gestionar Miembros — Admin overview of responsible payers and their students.
 *
 * Displays all MemberAccount records (account owners / responsible payers)
 * with their associated students. Shows membership status, payment summary,
 * and contact/identity information for each.
 *
 * Connected to the real backend (Fase 4): `GET /api/members` aggregates
 * `/personas`, `/membresias/pagos*` and `/ranking/niveles*` server-side —
 * see src/lib/server/members-adapter.ts for the DTO translation and the
 * backend gaps found while building it (no `email`/`roles`/account-active
 * flag exposed on Persona).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
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
  AlertTriangle,
} from "lucide-react";
import { fetchMembers, fetchNivelesConOcupacion } from "@/services/api";
import { nivelToGrupo } from "@/app/groups/groups-page-utils";
import {
  buildMemberStats,
  formatMembershipPeriod,
  countActiveStudents,
  filterAccounts,
  accountMatchesFlag,
  countAccountsMatchingFlag,
  getAccountStatusBadge,
  getNivelLabelFromGrupo,
  MEMBERSHIP_STATUS_LABELS,
  MEMBERSHIP_STATUS_BADGE,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE,
  getPayerTypeLabel,
  type MemberAccount,
  type MemberStudentSummary,
  type MemberFilterFlag,
  type PaymentStatus,
} from "./members-utils";
import type { Grupo } from "@/types/domain";
import { formatCurrency, formatDate } from "@/lib/format-utils";

const FILTER_CHIPS: { flag: MemberFilterFlag; label: string }[] = [
  { flag: "all", label: "Todos" },
  { flag: "vencida", label: "Membresía vencida" },
  { flag: "pendiente", label: "Pago pendiente" },
  { flag: "sin-grupo", label: "Sin grupo asignado" },
];

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
  grupos: Grupo[];
}

function StudentRow({ student, grupos }: StudentRowProps): React.ReactElement {
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

  const nivelDisplay = getNivelLabelFromGrupo(student.grupoId, grupos);

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
                  {student.membresia.tipo}{" "}
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
  grupos: Grupo[];
}

function AccountRow({
  account,
  defaultOpen,
  grupos,
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
            aria-controls={account.estudiantes.map((a) => `student-detail-${a.id}`).join(" ")}
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
              {account.role === "representante" ? (
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
                {getPayerTypeLabel(account.role)}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5 text-xs text-cata-text/65">
          {account.email && (
            <div className="flex items-center gap-1.5">
              <Mail size={11} strokeWidth={1.5} aria-hidden="true" />
              {account.email}
            </div>
          )}
          <div className="mt-0.5 flex items-center gap-1.5">
            <Phone size={11} strokeWidth={1.5} aria-hidden="true" />
            {account.telefono}
          </div>
        </td>
        <td className="px-4 py-3.5 text-center">
          <span className="text-sm font-medium text-cata-text">
            {account.estudiantes.length}
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
        account.estudiantes.map((estudiante) => (
          <StudentRow key={estudiante.id} student={estudiante} grupos={grupos} />
        ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function MembersPage(): React.ReactElement {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFlag, setActiveFlag] = useState<MemberFilterFlag>("all");
  const [accounts, setAccounts] = useState<MemberAccount[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [membersData, niveles] = await Promise.all([fetchMembers(), fetchNivelesConOcupacion()]);
      setAccounts(membersData);
      setGrupos(niveles.map(nivelToGrupo));
    } catch {
      setError("No se pudieron cargar los miembros. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const stats = buildMemberStats(accounts);
  const filteredAccounts = filterAccounts(accounts, searchTerm).filter((account) =>
    accountMatchesFlag(account, activeFlag),
  );

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AppShell
        eyebrow="Gestión de Miembros"
        title="Miembros del Club"
        subtitle="Responsables de pago, estudiantes y resumen de membresías. Administre cuentas, estudiantes y estados de membresía desde un solo lugar."
      >
        {error && (
          <div
            className="mb-6 flex items-center gap-2 rounded-xl border border-cata-red/30 bg-cata-red/10 px-4 py-3 text-sm text-cata-red"
            role="alert"
          >
            <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
            {error}
            <button type="button" onClick={() => void loadMembers()} className="btn-ghost ml-auto text-xs">
              Reintentar
            </button>
          </div>
        )}

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
            label="Estudiantes"
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

        {/* Search + filter chips */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
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
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar miembros">
            {FILTER_CHIPS.map((chip) => {
              const isActive = activeFlag === chip.flag;
              const count = countAccountsMatchingFlag(accounts, chip.flag);
              return (
                <button
                  key={chip.flag}
                  type="button"
                  onClick={() => setActiveFlag(chip.flag)}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-cata-red bg-cata-red/10 text-cata-red"
                      : "border-cata-border text-cata-text/65 hover:bg-cata-bg"
                  }`}
                >
                  {chip.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      isActive ? "bg-cata-red/20" : "bg-cata-bg"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Members table */}
        {loading ? (
          <div className="card flex flex-col items-center py-16 text-center">
            <p className="text-sm text-cata-text/50">Cargando miembros…</p>
          </div>
        ) : filteredAccounts.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                    <th className="w-10 px-4 py-3 font-medium" />
                    <th className="px-4 py-3 font-medium">Responsable de pago</th>
                    <th className="px-4 py-3 font-medium">Contacto</th>
                    <th className="px-4 py-3 text-center font-medium">Estudiantes</th>
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
                      grupos={grupos}
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
              {searchTerm || activeFlag !== "all"
                ? "No se encontraron miembros con ese criterio de búsqueda."
                : "Aún no hay miembros registrados."}
            </p>
            {(searchTerm || activeFlag !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setActiveFlag("all");
                }}
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
            <h3 className="text-sm font-bold text-cata-text">Modelo de dominio</h3>
          </div>
          <p className="text-sm leading-relaxed text-cata-text/65">
            Cada <strong className="text-cata-text">responsable de pago</strong> (titular de cuenta) gestiona
            uno o más estudiantes. Un representante (ej. padre/madre) puede gestionar
            varios estudiantes. Un estudiante puede ser su propio responsable de pago.
            El <strong className="text-cata-text">nivel técnico</strong> lo lleva el grupo asignado, no el estudiante.
          </p>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
