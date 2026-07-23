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

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import ContextualHelp from "@/components/ContextualHelp";
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
  Stethoscope,
  Save,
  Loader2,
  Plus,
  ToggleLeft,
  ToggleRight,
  Tag,
  Pencil,
  X,
} from "lucide-react";
import { fetchMembers, asignarRol, quitarRol, cambiarEstadoCuenta, fetchFichaMedica, actualizarFichaMedica, fetchTiposMembresia, crearMembresia, actualizarPersona } from "@/services/api";
import type { TipoMembresiaCatalogo } from "@/services/api";
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
  MEMBERS_AGGREGATE_LIMIT,
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
import type { Grupo, BackendTipoRol, FichaMedicaEditable, TipoSangre } from "@/types/domain";
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
    <div className="card-hover flex items-center gap-3 p-4 sm:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
        {icon}
      </div>
      <p className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wider text-cata-text/65">
        {label}
      </p>
      <p className="shrink-0 text-2xl font-bold tracking-tight text-cata-text">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Medical record editor (expanded within a student row)
// ---------------------------------------------------------------------------

interface MedicalRecordEditorProps {
  personaId: number;
}

function MedicalRecordEditor({ personaId }: MedicalRecordEditorProps): React.ReactElement {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; ficha: FichaMedicaEditable; isNew: boolean }
  >({ status: "loading" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [tipoSangre, setTipoSangre] = useState<TipoSangre>("DESCONOCIDO");
  const [enfermedadesInput, setEnfermedadesInput] = useState("");
  const [alergias, setAlergias] = useState("");
  const [contactoEmergencia, setContactoEmergencia] = useState("");
  const [telefonoEmergencia, setTelefonoEmergencia] = useState("");

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setSaveError(null);
    setSaveSuccess(false);

    fetchFichaMedica(personaId)
      .then((ficha) => {
        if (cancelled) return;
        setTipoSangre(ficha.tipoSangre);
        setEnfermedadesInput(ficha.enfermedades.map((e) => e.nombreEnfermedad).join(", "));
        setAlergias(ficha.alergias ?? "");
        setContactoEmergencia(ficha.contactoEmergencia ?? "");
        setTelefonoEmergencia(ficha.telefonoEmergencia ?? "");
        setState({ status: "ready", ficha, isNew: false });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "No se pudo cargar la ficha médica.";
        if (message.toLowerCase().includes("not found") || message.toLowerCase().includes("no encontrada")) {
          // No medical record yet — allow creation of a new one.
          setState({ status: "ready", ficha: undefined as unknown as FichaMedicaEditable, isNew: true });
        } else {
          setState({ status: "error", message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [personaId, reloadToken]);

  async function handleSave(): Promise<void> {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const enfermedades = enfermedadesInput
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      await actualizarFichaMedica(personaId, {
        tipoSangre,
        enfermedades,
        alergias: alergias.trim() || undefined,
        contactoEmergencia: contactoEmergencia.trim() || undefined,
        telefonoEmergencia: telefonoEmergencia.trim() || undefined,
      });
      setSaveSuccess(true);
      setReloadToken((n) => n + 1);
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar la ficha médica.");
    } finally {
      setSaving(false);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm text-cata-text/50">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        Cargando ficha médica...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mt-4 rounded-xl border border-cata-red/30 bg-cata-red/10 p-4 text-sm text-cata-red">
        {state.message}
        <button
          type="button"
          onClick={() => setReloadToken((n) => n + 1)}
          className="btn-ghost ml-4 text-xs"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-cata-border bg-cata-surface p-3 sm:p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-cata-text">
        <Stethoscope size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        Ficha médica
        {state.isNew && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
            <Plus size={10} strokeWidth={2} aria-hidden="true" />
            Nueva
          </span>
        )}
      </h3>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor={`tipo-sangre-${personaId}`} className="mb-1 block text-xs font-medium text-cata-text/65">
            Tipo de sangre
          </label>
          <select
            id={`tipo-sangre-${personaId}`}
            value={tipoSangre}
            onChange={(e) => setTipoSangre(e.target.value as TipoSangre)}
            className="input-field w-full"
          >
            {["A_POSITIVO", "A_NEGATIVO", "B_POSITIVO", "B_NEGATIVO", "AB_POSITIVO", "AB_NEGATIVO", "O_POSITIVO", "O_NEGATIVO", "DESCONOCIDO"].map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <label htmlFor={`enfermedades-${personaId}`} className="mb-1 block text-xs font-medium text-cata-text/65">
            Enfermedades (separadas por coma)
          </label>
          <input
            id={`enfermedades-${personaId}`}
            type="text"
            value={enfermedadesInput}
            onChange={(e) => setEnfermedadesInput(e.target.value)}
            placeholder="Ej: Asma, Diabetes"
            className="input-field w-full"
          />
          <p className="mt-1 text-[10px] text-cata-text/45">
            Al guardar se reemplaza la lista completa. Dejar vacío borra todas las enfermedades.
          </p>
        </div>
        <div>
          <label htmlFor={`alergias-${personaId}`} className="mb-1 block text-xs font-medium text-cata-text/65">
            Alergias
          </label>
          <input
            id={`alergias-${personaId}`}
            type="text"
            value={alergias}
            onChange={(e) => setAlergias(e.target.value)}
            className="input-field w-full"
          />
        </div>
        <div>
          <label htmlFor={`contacto-${personaId}`} className="mb-1 block text-xs font-medium text-cata-text/65">
            Contacto de emergencia
          </label>
          <input
            id={`contacto-${personaId}`}
            type="text"
            value={contactoEmergencia}
            onChange={(e) => setContactoEmergencia(e.target.value)}
            className="input-field w-full"
          />
        </div>
        <div>
          <label htmlFor={`telefono-${personaId}`} className="mb-1 block text-xs font-medium text-cata-text/65">
            Teléfono de emergencia
          </label>
          <input
            id={`telefono-${personaId}`}
            type="text"
            value={telefonoEmergencia}
            onChange={(e) => setTelefonoEmergencia(e.target.value)}
            className="input-field w-full"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
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
          {saving ? "Guardando..." : "Guardar ficha médica"}
        </button>
        {saveError && (
          <p className="text-sm text-cata-red" role="alert">
            {saveError}
          </p>
        )}
        {saveSuccess && (
          <p className="flex items-center gap-1 text-sm text-cata-state-ok" role="status">
            <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
            Ficha médica guardada.
          </p>
        )}
      </div>
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
  const [showMedical, setShowMedical] = useState(false);
  const [showCreateMembership, setShowCreateMembership] = useState(false);
  const [tiposMembresia, setTiposMembresia] = useState<TipoMembresiaCatalogo[]>([]);
  const [selectedTipoId, setSelectedTipoId] = useState<number | "">("");
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [membershipSuccess, setMembershipSuccess] = useState(false);

  const [showLabels, setShowLabels] = useState(false);
  const [prioridadMunicipal, setPrioridadMunicipal] = useState(student.prioridadMunicipal);
  const [porcentajeBeca, setPorcentajeBeca] = useState<string>(String(student.porcentajeBeca ?? 0));
  const [motivoBeca, setMotivoBeca] = useState(student.motivoBeca ?? "");
  const [labelsSaving, setLabelsSaving] = useState(false);
  const [labelsError, setLabelsError] = useState<string | null>(null);
  const [labelsSuccess, setLabelsSuccess] = useState(false);

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
  const personaId = Number(student.id);

  async function handleSaveLabels(): Promise<void> {
    setLabelsSaving(true);
    setLabelsError(null);
    setLabelsSuccess(false);
    try {
      const beca = Number(porcentajeBeca);
      await actualizarPersona(personaId, {
        prioridadMunicipal,
        porcentajeBeca: Number.isFinite(beca) && beca >= 0 && beca <= 100 ? beca : 0,
        motivoBeca: motivoBeca.trim() || undefined,
      });
      setLabelsSuccess(true);
    } catch (err) {
      setLabelsError(err instanceof Error ? err.message : "No se pudieron guardar las etiquetas.");
    } finally {
      setLabelsSaving(false);
    }
  }

  async function handleOpenCreateMembership(): Promise<void> {
    setShowCreateMembership(true);
    setMembershipError(null);
    setMembershipSuccess(false);
    if (tiposMembresia.length === 0) {
      try {
        const tipos = await fetchTiposMembresia();
        setTiposMembresia(tipos);
      } catch {
        setMembershipError("No se pudieron cargar los tipos de membresía.");
      }
    }
  }

  async function handleCreateMembership(): Promise<void> {
    if (!selectedTipoId || !personaId) return;
    const tipo = tiposMembresia.find((t) => t.id === selectedTipoId);
    if (!tipo) return;

    setMembershipLoading(true);
    setMembershipError(null);
    try {
      await crearMembresia({
        personaId,
        tipoMembresiaId: selectedTipoId,
        montoAplicado: Number(tipo.precio),
      });
      setMembershipSuccess(true);
      setShowCreateMembership(false);
    } catch (err) {
      setMembershipError(
        err instanceof Error ? err.message : "Error al crear la membresía.",
      );
    } finally {
      setMembershipLoading(false);
    }
  }

  return (
    <tr id={`student-detail-${student.id}`} className="border-t border-cata-border bg-cata-bg/60">
      <td colSpan={7} className="px-3 py-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {student.prioridadMunicipal && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                  Prioridad municipal
                </span>
              )}
              {(student.porcentajeBeca ?? 0) > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700"
                  title={student.motivoBeca || undefined}
                >
                  Beca {student.porcentajeBeca ?? 0}%
                </span>
              )}
            </div>
          </div>

          {/* Membership — spans the full row while the "Crear membresía" form is
              open so the type select and Crear/Cancelar buttons have room; a
              single grid column is too narrow for the long option labels
              ("{categoria} — ${precio} ({modalidad})") and made the form look
              cut off (reported in live QA). */}
          <div className={showCreateMembership ? "sm:col-span-2 lg:col-span-4" : undefined}>
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
            ) : membershipSuccess ? (
              <span className="inline-flex items-center gap-1 text-xs text-cata-state-ok">
                <CheckCircle2 size={11} strokeWidth={2} aria-hidden="true" />
                Membresía creada. Recarga para verla.
              </span>
            ) : showCreateMembership ? (
              <div className="max-w-md space-y-2">
                <select
                  value={selectedTipoId}
                  onChange={(e) => setSelectedTipoId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full rounded-lg border border-cata-border bg-cata-surface px-2.5 py-1.5 text-xs text-cata-text"
                >
                  <option value="">Seleccionar tipo...</option>
                  {tiposMembresia.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.categoria} — ${tipo.precio} ({tipo.modalidad})
                    </option>
                  ))}
                </select>
                {membershipError && (
                  <p className="text-xs text-cata-red">{membershipError}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCreateMembership()}
                    disabled={!selectedTipoId || membershipLoading}
                    className="inline-flex items-center gap-1 rounded-lg bg-cata-red px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-cata-red/80 disabled:opacity-50"
                  >
                    {membershipLoading ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Plus size={11} />
                    )}
                    Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateMembership(false)}
                    className="rounded-lg border border-cata-border px-2.5 py-1 text-xs text-cata-text/65 transition-colors hover:bg-cata-surface"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className="text-xs text-cata-text/40">Sin membresía registrada</span>
                <button
                  type="button"
                  onClick={() => handleOpenCreateMembership()}
                  className="inline-flex items-center gap-1 rounded-lg bg-cata-red/15 px-2.5 py-1 text-xs font-medium text-cata-red transition-colors hover:bg-cata-red/25"
                >
                  <Plus size={11} strokeWidth={2} aria-hidden="true" />
                  Crear membresía
                </button>
              </div>
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

          {/* Status indicator + action buttons */}
          <div className="flex flex-col items-end gap-2">
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
            <div className="flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setShowLabels((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-cata-border bg-cata-surface px-2 py-1 text-[11px] font-medium text-cata-text transition-colors hover:bg-cata-bg"
              >
                <Tag size={11} strokeWidth={1.5} aria-hidden="true" />
                Etiquetas
              </button>
              <button
                type="button"
                onClick={() => setShowMedical((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg bg-cata-red/15 px-2 py-1 text-[11px] font-medium text-cata-red transition-colors hover:bg-cata-red/25"
              >
                <Stethoscope size={11} strokeWidth={1.5} aria-hidden="true" />
                Ficha médica
              </button>
            </div>
          </div>
        </div>

        {showLabels && (
          <div className="mt-3 rounded-2xl border border-cata-border bg-cata-surface p-3 sm:p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-cata-text">
              <Tag size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              Etiquetas
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex items-center gap-2 rounded-lg border border-cata-border bg-cata-bg px-3 py-2 text-xs text-cata-text">
                <input
                  type="checkbox"
                  checked={prioridadMunicipal}
                  onChange={(e) => setPrioridadMunicipal(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-cata-border text-cata-red focus:ring-cata-red"
                />
                Prioridad municipal
              </label>
              <div>
                <label htmlFor={`beca-${student.id}`} className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-cata-text/50">
                  Beca (%)
                </label>
                <input
                  id={`beca-${student.id}`}
                  type="number"
                  min={0}
                  max={100}
                  value={porcentajeBeca}
                  onChange={(e) => setPorcentajeBeca(e.target.value)}
                  className="input-field w-full py-1.5 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`motivo-beca-${student.id}`} className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-cata-text/50">
                  Motivo de la beca
                </label>
                <input
                  id={`motivo-beca-${student.id}`}
                  type="text"
                  value={motivoBeca}
                  onChange={(e) => setMotivoBeca(e.target.value)}
                  placeholder="Ej: Deportista destacado"
                  className="input-field w-full py-1.5 text-xs"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSaveLabels()}
                disabled={labelsSaving}
                className="btn-primary inline-flex items-center gap-1.5 py-1.5 text-xs disabled:opacity-50"
              >
                {labelsSaving ? (
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Save size={12} strokeWidth={1.5} aria-hidden="true" />
                )}
                {labelsSaving ? "Guardando..." : "Guardar etiquetas"}
              </button>
              {labelsError && <p className="text-xs text-cata-red" role="alert">{labelsError}</p>}
              {labelsSuccess && (
                <p className="flex items-center gap-1 text-xs text-cata-state-ok" role="status">
                  <CheckCircle2 size={12} strokeWidth={2} aria-hidden="true" />
                  Etiquetas guardadas.
                </p>
              )}
            </div>
          </div>
        )}

        {showMedical && <MedicalRecordEditor personaId={personaId} />}
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
  editModalOpen: boolean;
  onToggleEditModal: () => void;
}

const ALL_BACKEND_ROLES: BackendTipoRol[] = ["ADMINISTRADOR", "ENTRENADOR", "REPRESENTANTE", "ALUMNO"];

const ROLE_LABELS: Record<BackendTipoRol, string> = {
  ADMINISTRADOR: "Admin",
  ENTRENADOR: "Entrenador",
  REPRESENTANTE: "Representante",
  ALUMNO: "Alumno",
};

function AccountRow({
  account,
  defaultOpen,
  grupos,
  editModalOpen,
  onToggleEditModal,
}: AccountRowProps): React.ReactElement {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [roles, setRoles] = useState<BackendTipoRol[]>([]);
  const [activo, setActivo] = useState(true);
  const [roleLoading, setRoleLoading] = useState<BackendTipoRol | null>(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const activeCount = countActiveStudents(account);
  const statusBadge = getAccountStatusBadge(account);
  const personaId = Number(account.id);

  async function toggleRole(role: BackendTipoRol): Promise<void> {
    setRoleLoading(role);
    setRoleError(null);
    const hasRole = roles.includes(role);

    try {
      if (hasRole) {
        await quitarRol(personaId, role);
        setRoles((prev) => prev.filter((r) => r !== role));
      } else {
        await asignarRol(personaId, role);
        setRoles((prev) => [...prev, role]);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el rol.";
      // If the backend says the role is already present/absent, reconcile local state.
      if (message.toLowerCase().includes("ya tiene el rol")) {
        setRoles((prev) => (prev.includes(role) ? prev : [...prev, role]));
      } else if (message.toLowerCase().includes("no tiene el rol")) {
        setRoles((prev) => prev.filter((r) => r !== role));
      } else {
        setRoleError(message);
      }
    } finally {
      setRoleLoading(null);
    }
  }

  async function toggleEstado(): Promise<void> {
    setStateLoading(true);
    setStateError(null);
    const next = !activo;

    try {
      await cambiarEstadoCuenta(personaId, next);
      setActivo(next);
    } catch (error: unknown) {
      setStateError(error instanceof Error ? error.message : "No se pudo cambiar el estado.");
    } finally {
      setStateLoading(false);
    }
  }

  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const editTriggerRef = useRef<HTMLButtonElement>(null);

  // Native <dialog> shown via showModal(): the browser traps Tab focus and
  // renders the ::backdrop for us, so no manual focus trap is needed (unlike
  // ConfirmDialog.tsx's older role="dialog" div convention). Escape is still
  // wired manually (rather than relying solely on the dialog's native
  // "cancel" event) so open/closed stays driven by `editModalOpen` alone —
  // the dialog is conditionally rendered, not toggled via its `open`
  // attribute, so the JSX onCancel handler only preventDefaults the native
  // auto-close to avoid it and this listener double-toggling React state.
  // The backdrop-click listener is attached imperatively (not as a JSX
  // onClick on the <dialog>) since the element itself is non-interactive.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!editModalOpen || !dialog) return;

    setRoleError(null);
    setStateError(null);
    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onToggleEditModal();
    }
    function handleBackdropClick(event: MouseEvent): void {
      if (event.target === dialog) onToggleEditModal();
    }

    document.addEventListener("keydown", handleKeyDown);
    dialog.addEventListener("click", handleBackdropClick);
    const triggerElement = editTriggerRef.current;
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      dialog.removeEventListener("click", handleBackdropClick);
      triggerElement?.focus();
    };
  }, [editModalOpen, onToggleEditModal]);

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
              <span className={`mt-1 inline-flex sm:hidden ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            </div>
          </div>
        </td>
        <td className="hidden px-4 py-3.5 text-xs text-cata-text/65 sm:table-cell">
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
        <td className="hidden px-4 py-3.5 text-center sm:table-cell">
          <span className="text-sm font-medium text-cata-text">
            {account.estudiantes.length}
          </span>
        </td>
        <td className="hidden px-4 py-3.5 text-center sm:table-cell">
          <span className="text-sm font-medium text-cata-text">
            {activeCount}
          </span>
        </td>
        <td className="hidden px-4 py-3.5 sm:table-cell">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
            <button
              ref={editTriggerRef}
              type="button"
              onClick={onToggleEditModal}
              className="inline-flex items-center gap-1 rounded-lg border border-cata-border p-1.5 text-cata-text/50 transition-colors hover:bg-cata-red/10 hover:text-cata-red"
              aria-label="Editar"
              title="Editar miembro"
            >
              <Pencil size={13} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
      {expanded &&
        account.estudiantes.map((estudiante) => (
          <StudentRow key={estudiante.id} student={estudiante} grupos={grupos} />
        ))}
      {editModalOpen &&
        createPortal(
          <dialog
            ref={dialogRef}
            aria-modal="true"
            aria-labelledby={`edit-member-title-${account.id}`}
            onCancel={(event) => event.preventDefault()}
            className="card fixed inset-0 z-50 m-auto h-fit max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto p-6 backdrop:bg-cata-black/40"
          >
            <div className="mb-4 flex items-center justify-between">
                <h2
                  id={`edit-member-title-${account.id}`}
                  className="text-base font-semibold text-cata-text"
                >
                  Editar miembro
                </h2>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onToggleEditModal}
                  aria-label="Cerrar"
                  className="rounded-lg p-1 text-cata-text/50 transition-colors hover:bg-cata-bg hover:text-cata-text"
                >
                  <X size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>

              <div className="mb-4 space-y-1 text-sm text-cata-text/65">
                <p className="font-medium text-cata-text">
                  {account.nombres} {account.apellidos}
                </p>
                {account.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail size={11} strokeWidth={1.5} aria-hidden="true" />
                    {account.email}
                  </p>
                )}
                <p className="flex items-center gap-1.5">
                  <Phone size={11} strokeWidth={1.5} aria-hidden="true" />
                  {account.telefono}
                </p>
              </div>

              <div className="mb-4">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-cata-text/50">
                  <ShieldCheck size={12} strokeWidth={1.5} aria-hidden="true" />
                  Roles
                </h3>
                <div className="space-y-1.5">
                  {ALL_BACKEND_ROLES.map((role) => {
                    const selected = roles.includes(role);
                    const isLoading = roleLoading === role;
                    return (
                      <label
                        key={role}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-cata-text transition-colors hover:bg-cata-bg"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => void toggleRole(role)}
                          disabled={roleLoading !== null}
                          className="h-3.5 w-3.5 rounded border-cata-border text-cata-red focus:ring-cata-red"
                        />
                        {isLoading && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
                        {ROLE_LABELS[role]}
                      </label>
                    );
                  })}
                </div>
                {roleError && (
                  <p className="mt-2 text-xs text-cata-red" role="alert">
                    {roleError}
                  </p>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-cata-text/50">
                  Estado de la cuenta
                </h3>
                <button
                  type="button"
                  onClick={() => void toggleEstado()}
                  disabled={stateLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cata-border px-3 py-1.5 text-sm font-medium text-cata-text transition-colors hover:bg-cata-bg disabled:opacity-50"
                  aria-pressed={activo}
                >
                  {activo ? (
                    <ToggleRight size={16} className="text-cata-state-ok" aria-hidden="true" />
                  ) : (
                    <ToggleLeft size={16} className="text-cata-text/40" aria-hidden="true" />
                  )}
                  {stateLoading ? "Actualizando..." : activo ? "Activa" : "Inactiva"}
                </button>
                {stateError && (
                  <p className="mt-2 text-xs text-cata-red" role="alert">
                    {stateError}
                  </p>
                )}
              </div>
          </dialog>,
          document.body,
        )}
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
  const [personasCapped, setPersonasCapped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const toggleEditModal = useCallback((accountId: string) => {
    setEditingAccountId((prev) => (prev === accountId ? null : accountId));
  }, []);

  const loadMembers = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setPersonasCapped(false);
    try {
      const { accounts: membersData, niveles, personasCapped: upstreamPersonasCapped } = await fetchMembers();
      setAccounts(membersData);
      setGrupos(niveles.map(nivelToGrupo));
      setPersonasCapped(upstreamPersonasCapped);
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
  const aggregateIsCapped = personasCapped;

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AppShell
        eyebrow="Gestión de Miembros"
        title="Miembros del Club"
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
        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={<Users size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
            label="Cuentas"
            value={stats.totalAccounts}
          />
          <StatCard
            icon={<UserCheck size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
            label="Estudiantes"
            value={stats.totalStudents}
          />
          <StatCard
            icon={<ShieldCheck size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
            label="Membresías activas"
            value={stats.activeMemberships}
          />
          <StatCard
            icon={<Clock size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
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
        {!loading && (
          <ContextualHelp title="Ayuda sobre límite de resultados">
            <p>Este listado puede incluir hasta {MEMBERS_AGGREGATE_LIMIT} registros y no confirma que se hayan cargado todos los miembros.</p>
          </ContextualHelp>
        )}
        {loading ? (
          <div className="card flex flex-col items-center py-16 text-center">
            <p className="text-sm text-cata-text/50">Cargando miembros…</p>
          </div>
        ) : filteredAccounts.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cata-border px-4 py-3 text-xs text-cata-text/65">
              <p role="status" aria-label="Resultados mostrados">
                {filteredAccounts.length} resultados mostrados
              </p>
              {aggregateIsCapped && (
                <p role="alert" className="max-w-md text-cata-red">
                  La fuente devuelve hasta {MEMBERS_AGGREGATE_LIMIT} registros; este listado puede estar incompleto.
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                    <th className="w-10 px-4 py-3 font-medium" />
                    <th className="px-4 py-3 font-medium">Responsable de pago</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Contacto</th>
                    <th className="hidden px-4 py-3 text-center font-medium sm:table-cell">Estudiantes</th>
                    <th className="hidden px-4 py-3 text-center font-medium sm:table-cell">Activos</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cata-border">
                  {filteredAccounts.map((account, index) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      defaultOpen={index === 0 && filteredAccounts.length === 1}
                      grupos={grupos}
                      editModalOpen={editingAccountId === account.id}
                      onToggleEditModal={() => toggleEditModal(account.id)}
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
