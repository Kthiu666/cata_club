/**
 * Ranking (Track Ranking) — Trainer page for managing the competitive
 * ranking system.
 *
 * Three tabs:
 *  - Asignar Nivel: assign/move each student's nivel (initial assignment via
 *    `asignar-nivel-inicial`, re-assignment via `mover-de-nivel`).
 *  - Resultados Mensuales: register a monthly result (posición, participó)
 *    for a student.
 *  - Cierre de Mes: close out the current ranking month for a nivel
 *    (irreversible — confirmed before submitting).
 *
 * The "ranking nivel" a student is assigned to IS the same `nivel_ranking`
 * record used by Grupo/`NivelTecnico` (see src/app/groups/page.tsx) — the
 * backend only has one such table, fetched here via the same
 * fetchNivelesConOcupacion()/fetchMembers() calls groups.tsx uses. Mutating
 * actions call the real backend endpoints (assignStudentToNivel/
 * moveStudentToNivel, same functions groups.tsx uses; registrarResultadoMensual
 * and cerrarMes under /api/ranking/**), so after a successful assignment the
 * member list is reloaded to reflect the student's new nivel.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  Trophy,
  ListChecks,
  Lock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Search,
  GraduationCap,
} from "lucide-react";
import type { ResultadoMensual, CierreMensual, NivelTecnico } from "@/types/domain";
import {
  fetchMembers,
  assignStudentToNivel,
  moveStudentToNivel,
  registrarResultadoMensual,
  cerrarMes,
  ApiClientError,
  type NivelConOcupacion,
} from "@/services/api";
import { isValidPeriodo, currentPeriodo, parsePeriodo, buildRankingStudents } from "./ranking-utils";
import { filterStudentsByQuery, resolveNivelCategoria } from "../trainer-panel-utils";
import { getLevelLabel } from "@/lib/groups-utils";
import { getLevelBadgeClass } from "@/app/groups/groups-page-utils";

type TabKey = "asignar" | "resultados" | "cierre";

const TABS: { key: TabKey; label: string }[] = [
  { key: "asignar", label: "Asignar Nivel" },
  { key: "resultados", label: "Resultados Mensuales" },
  { key: "cierre", label: "Cierre de Mes" },
];

function nivelLabel(niveles: NivelConOcupacion[], nivelId: number | null): string {
  if (nivelId === null) return "Sin asignar";
  const nivel = niveles.find((n) => n.id === nivelId);
  return nivel ? nivel.nombre ?? String(nivel.numeroNivel) : `Nivel ${nivelId}`;
}

function studentDisplayName(
  students: { id: string; nombres: string; apellidos: string }[],
  personaId: number,
): string {
  const student = students.find((s) => s.id === String(personaId));
  return student ? `${student.nombres} ${student.apellidos}` : String(personaId);
}

/** Local-only pairing of a closure with who triggered it — the backend response has no such field. */
interface CierreConAutor extends CierreMensual {
  cerradoPor: string;
}

interface LevelBadgeProps {
  level: string;
}

/**
 * Color-coded "nivel actual" badge for the AsignarNivelTab table — a
 * trivial adaptation of the admin Ranking page's `LevelBadge`
 * (src/app/ranking/page.tsx), reusing the SAME `LEVEL_BADGE` color/class
 * convention (src/app/groups/groups-page-utils.ts) instead of a second,
 * drifting color mapping. Not imported directly: the admin page's
 * `LevelBadge` is a local, unexported component.
 */
function LevelBadge({ level }: Readonly<LevelBadgeProps>): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getLevelBadgeClass(level)}`}
    >
      <GraduationCap size={10} strokeWidth={2} className="mr-1" aria-hidden="true" />
      {getLevelLabel(level as NivelTecnico)}
    </span>
  );
}

export default function RankingPage(): React.ReactElement {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("asignar");

  const [members, setMembers] = useState<Awaited<ReturnType<typeof fetchMembers>>["accounts"]>([]);
  const [niveles, setNiveles] = useState<NivelConOcupacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Local, frontend-only state — no GET endpoint exists yet for monthly
  // results or closures, so these lists are seeded empty and grow as
  // actions succeed within the session.
  const [resultados, setResultados] = useState<ResultadoMensual[]>([]);
  const [cierres, setCierres] = useState<CierreConAutor[]>([]);

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      const { accounts: membersData, niveles: nivelesData } = await fetchMembers();
      setMembers(membersData);
      setNiveles(nivelesData);
    } catch {
      setLoadError("No se pudieron cargar los estudiantes. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const students = buildRankingStudents(members);

  return (
    <ProtectedRoute allowedRoles={["trainer"]}>
      <div>
        {/* Hero Banner */}
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-cata-border bg-cata-surface px-6 py-10 shadow-elevated sm:px-10 sm:py-12">
          <div className="absolute inset-0 bg-logo-glow" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
              <Trophy size={14} strokeWidth={2} aria-hidden="true" />
              Ranking Competitivo
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-cata-text sm:text-4xl">
              Ranking
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-cata-text/60">
              Asigná el nivel de cada estudiante, registrá resultados mensuales y cerrá el mes
              por nivel.
            </p>
          </div>
        </div>

        {loadError && (
          <div
            className="mb-6 flex items-center gap-2 rounded-xl border border-cata-red/30 bg-cata-red/10 px-4 py-3 text-sm text-cata-red"
            role="alert"
          >
            <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
            {loadError}
            <button type="button" onClick={() => void loadData()} className="btn-ghost ml-auto text-xs">
              Reintentar
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-2" role="tablist" aria-label="Secciones de Ranking">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-cata-red/15 text-cata-red"
                  : "bg-cata-bg text-cata-text/65 hover:bg-cata-border/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "asignar" && (
          <AsignarNivelTab
            students={students}
            niveles={niveles}
            loading={loading}
            onAssigned={loadData}
          />
        )}

        {activeTab === "resultados" && (
          <ResultadosMensualesTab
            students={students}
            niveles={niveles}
            resultados={resultados}
            onRegistered={(resultado) => setResultados((prev) => [resultado, ...prev])}
          />
        )}

        {activeTab === "cierre" && (
          <CierreMesTab
            niveles={niveles}
            cierres={cierres}
            cerradoPorNombre={session?.user.name ?? "Entrenador"}
            onClosed={(cierre) => setCierres((prev) => [cierre, ...prev])}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// ---------------------------------------------------------------------------
// Tab 1 — Asignar Nivel
// ---------------------------------------------------------------------------

interface AsignarNivelTabProps {
  students: ReturnType<typeof buildRankingStudents>;
  niveles: NivelConOcupacion[];
  loading: boolean;
  onAssigned: () => Promise<void>;
}

function AsignarNivelTab({ students, niveles, loading, onAssigned }: AsignarNivelTabProps): React.ReactElement {
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filteredStudents = filterStudentsByQuery(students, query);

  async function handleAssign(estudianteId: string): Promise<void> {
    const nivelId = drafts[estudianteId];
    if (!nivelId) return;

    const student = students.find((s) => s.id === estudianteId);
    setSavingId(estudianteId);
    setError(null);
    setSuccessId(null);
    try {
      if (student?.nivelRankingId === null || student?.nivelRankingId === undefined) {
        await assignStudentToNivel(Number(estudianteId), nivelId);
      } else {
        await moveStudentToNivel(Number(estudianteId), nivelId);
      }
      await onAssigned();
      setSuccessId(estudianteId);
    } catch (err) {
      console.error("[ranking] assign/move nivel failed", err);
      setError(
        err instanceof ApiClientError ? err.message : "Error al asignar el nivel de ranking.",
      );
    } finally {
      setSavingId(null);
    }
  }

  let tableSection: React.ReactElement;
  if (loading) {
    tableSection = (
      <div className="flex flex-col items-center py-12 text-center">
        <p className="text-sm text-cata-text/50">Cargando estudiantes…</p>
      </div>
    );
  } else if (students.length === 0) {
    tableSection = (
      <div className="flex flex-col items-center py-12 text-center">
        <Users size={32} strokeWidth={1.5} className="mb-3 text-cata-text/20" aria-hidden="true" />
        <p className="text-sm text-cata-text/50">No hay estudiantes registrados.</p>
      </div>
    );
  } else if (filteredStudents.length === 0) {
    tableSection = (
      <div className="flex flex-col items-center py-12 text-center">
        <Search size={32} strokeWidth={1.5} className="mb-3 text-cata-text/20" aria-hidden="true" />
        <p className="text-sm text-cata-text/50">Ningún estudiante coincide con la búsqueda.</p>
      </div>
    );
  } else {
    tableSection = (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                <th className="px-4 py-3 font-medium">Estudiante</th>
                <th className="px-4 py-3 font-medium">Nivel actual</th>
                <th className="px-4 py-3 font-medium">Nuevo nivel</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cata-border">
              {filteredStudents.map((student) => {
                const nivelCategoria = resolveNivelCategoria(student.nivelRankingId, niveles);

                let assignButtonLabel: React.ReactNode = "Asignar";
                if (savingId === student.id) {
                  assignButtonLabel = "Guardando...";
                } else if (successId === student.id) {
                  assignButtonLabel = (
                    <>
                      <CheckCircle2 size={12} strokeWidth={2} aria-hidden="true" />
                      Asignado
                    </>
                  );
                }

                return (
                <tr key={student.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-cata-text">
                      {student.nombres} {student.apellidos}
                    </span>
                    {!student.activo && (
                      <span className="ml-2 rounded bg-cata-bg px-1.5 py-0.5 text-[10px] font-medium text-cata-text/45">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-cata-text/65">
                    {nivelCategoria ? (
                      <LevelBadge level={nivelCategoria} />
                    ) : (
                      nivelLabel(niveles, student.nivelRankingId)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Nuevo nivel para ${student.nombres} ${student.apellidos}`}
                      className="input-field w-24 py-1.5 text-sm"
                      value={drafts[student.id] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [student.id]: Number(e.target.value) }))
                      }
                    >
                      <option value="">—</option>
                      {niveles.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.nombre ?? n.numeroNivel}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={!drafts[student.id] || savingId === student.id}
                      onClick={() => handleAssign(student.id)}
                      className="btn-secondary py-1.5 text-xs"
                    >
                      {assignButtonLabel}
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cata-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Users size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-sm font-bold text-cata-text">Estudiantes ({filteredStudents.length})</h2>
        </div>
        <div className="relative w-full max-w-xs">
          <Search
            size={14}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-text/65"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alumno..."
            className="input-field pl-9"
            aria-label="Buscar alumno"
          />
        </div>
      </div>

      {error && (
        <div className="alert-error mx-5 mt-4" role="alert">
          {error}
        </div>
      )}

      {tableSection}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2 — Resultados Mensuales
// ---------------------------------------------------------------------------

interface ResultadosMensualesTabProps {
  students: ReturnType<typeof buildRankingStudents>;
  niveles: NivelConOcupacion[];
  resultados: ResultadoMensual[];
  onRegistered: (resultado: ResultadoMensual) => void;
}

function ResultadosMensualesTab({
  students,
  niveles,
  resultados,
  onRegistered,
}: ResultadosMensualesTabProps): React.ReactElement {
  const [estudianteId, setEstudianteId] = useState("");
  const [periodo, setPeriodo] = useState(currentPeriodo());
  const [posicion, setPosicion] = useState("");
  const [participo, setParticipo] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSuccessMessage(null);
    setSubmitError(null);

    if (!estudianteId) {
      setValidationError("Seleccioná un estudiante.");
      return;
    }
    if (!isValidPeriodo(periodo)) {
      setValidationError('El período debe tener el formato "YYYY-MM".');
      return;
    }
    let posicionNum: number | undefined;
    if (posicion.trim() !== "") {
      posicionNum = Number(posicion);
      if (!Number.isInteger(posicionNum) || posicionNum < 1) {
        setValidationError("La posición debe ser un número entero positivo.");
        return;
      }
    }
    setValidationError(null);

    setSubmitting(true);
    try {
      const { anio, mes } = parsePeriodo(periodo);
      const resultado = await registrarResultadoMensual({
        personaId: Number(estudianteId),
        anio,
        mes,
        posicion: posicionNum,
        participo,
      });
      onRegistered(resultado);
      setSuccessMessage("Resultado mensual registrado correctamente.");
      setPosicion("");
      setParticipo(true);
    } catch (err) {
      console.error("[ranking] registrarResultadoMensual failed", err);
      setSubmitError(
        err instanceof ApiClientError
          ? err.message
          : "Error al registrar el resultado mensual.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="card space-y-4 p-5">
        <div className="flex items-center gap-2">
          <ListChecks size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-sm font-bold text-cata-text">Registrar resultado mensual</h2>
        </div>

        {validationError && (
          <p className="text-xs text-cata-red" role="alert">
            {validationError}
          </p>
        )}
        {submitError && (
          <div className="alert-error" role="alert">
            {submitError}
          </div>
        )}
        {successMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-cata-state-ok/30 bg-cata-state-ok/10 px-4 py-2.5 text-sm text-cata-state-ok">
            <CheckCircle2 size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
            {successMessage}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-cata-text/65">Estudiante</span>
            <select
              className="input-field"
              value={estudianteId}
              onChange={(e) => setEstudianteId(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombres} {s.apellidos}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-cata-text/65">Período</span>
            <input
              type="month"
              className="input-field"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-cata-text/65">
              Posición (opcional)
            </span>
            <input
              type="number"
              min={1}
              className="input-field"
              value={posicion}
              onChange={(e) => setPosicion(e.target.value)}
              placeholder="1"
            />
          </label>

          <label className="mt-6 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={participo}
              onChange={(e) => setParticipo(e.target.checked)}
            />
            <span className="text-xs font-medium text-cata-text/65">Participó este mes</span>
          </label>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? (
            "Registrando..."
          ) : (
            <>
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              Registrar resultado
            </>
          )}
        </button>
      </form>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-cata-border px-5 py-4">
          <ListChecks size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-sm font-bold text-cata-text">
            Resultados registrados ({resultados.length})
          </h2>
        </div>
        {resultados.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <ListChecks size={28} strokeWidth={1.5} className="mb-3 text-cata-text/20" aria-hidden="true" />
            <p className="text-sm text-cata-text/50">Aún no hay resultados registrados en esta sesión.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                  <th className="px-4 py-3 font-medium">Estudiante</th>
                  <th className="px-4 py-3 font-medium">Nivel</th>
                  <th className="px-4 py-3 font-medium">Período</th>
                  <th className="px-4 py-3 font-medium text-right">Posición</th>
                  <th className="px-4 py-3 font-medium">Participó</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cata-border">
                {resultados.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-cata-text">
                      {studentDisplayName(students, r.personaId)}
                    </td>
                    <td className="px-4 py-3 text-cata-text/65">{nivelLabel(niveles, r.nivelRankingId)}</td>
                    <td className="px-4 py-3 text-cata-text/65">
                      {r.anio}-{String(r.mes).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-cata-text">
                      {r.posicion ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-cata-text/45">{r.participo ? "Sí" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3 — Cierre de Mes
// ---------------------------------------------------------------------------

interface CierreMesTabProps {
  niveles: NivelConOcupacion[];
  cierres: CierreConAutor[];
  cerradoPorNombre: string;
  onClosed: (cierre: CierreConAutor) => void;
}

function CierreMesTab({ niveles, cierres, cerradoPorNombre, onClosed }: CierreMesTabProps): React.ReactElement {
  const [nivelId, setNivelId] = useState("");
  const [periodo, setPeriodo] = useState(currentPeriodo());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleRequestClose(): void {
    setSuccessMessage(null);
    setError(null);
    if (!nivelId) {
      setValidationError("Seleccioná un nivel.");
      return;
    }
    if (!isValidPeriodo(periodo)) {
      setValidationError('El período debe tener el formato "YYYY-MM".');
      return;
    }
    setValidationError(null);
    setConfirmOpen(true);
  }

  async function handleConfirmClose(): Promise<void> {
    setConfirmOpen(false);
    if (!nivelId) return;

    setClosing(true);
    setError(null);
    try {
      const { anio, mes } = parsePeriodo(periodo);
      const cierre = await cerrarMes(Number(nivelId), { anio, mes });
      onClosed({ ...cierre, cerradoPor: cerradoPorNombre });
      setSuccessMessage(`Mes ${periodo} cerrado para ${nivelLabel(niveles, Number(nivelId))}.`);
    } catch (err) {
      console.error("[ranking] cerrarMes failed", err);
      setError(
        err instanceof ApiClientError ? err.message : "Error al cerrar el mes de ranking.",
      );
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Lock size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-sm font-bold text-cata-text">Cerrar mes de ranking</h2>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          Cerrar el mes es una acción irreversible: bloquea el registro de nuevos resultados para
          ese nivel y período.
        </div>

        {validationError && (
          <p className="text-xs text-cata-red" role="alert">
            {validationError}
          </p>
        )}
        {error && (
          <div className="alert-error" role="alert">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-cata-state-ok/30 bg-cata-state-ok/10 px-4 py-2.5 text-sm text-cata-state-ok">
            <CheckCircle2 size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
            {successMessage}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-cata-text/65">Nivel</span>
            <select
              className="input-field"
              value={nivelId}
              onChange={(e) => setNivelId(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {niveles.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre ?? n.numeroNivel}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-cata-text/65">Período</span>
            <input
              type="month"
              className="input-field"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </label>
        </div>

        <button
          type="button"
          disabled={closing}
          onClick={handleRequestClose}
          className="btn-secondary border-cata-red/30 text-cata-red hover:bg-cata-red/10"
        >
          {closing ? (
            "Cerrando..."
          ) : (
            <>
              <Lock size={14} strokeWidth={1.5} aria-hidden="true" />
              Cerrar mes
            </>
          )}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-cata-border px-5 py-4">
          <Lock size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-sm font-bold text-cata-text">Meses cerrados ({cierres.length})</h2>
        </div>
        {cierres.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <XCircle size={28} strokeWidth={1.5} className="mb-3 text-cata-text/20" aria-hidden="true" />
            <p className="text-sm text-cata-text/50">Aún no se cerró ningún mes en esta sesión.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                  <th className="px-4 py-3 font-medium">Nivel</th>
                  <th className="px-4 py-3 font-medium">Período</th>
                  <th className="px-4 py-3 font-medium text-right">Procesados</th>
                  <th className="px-4 py-3 font-medium text-right">Eliminados</th>
                  <th className="px-4 py-3 font-medium">Cerrado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cata-border">
                {cierres.map((c, i) => (
                  <tr key={`${c.nivelRankingId}-${c.anio}-${c.mes}-${i}`}>
                    <td className="px-4 py-3 font-medium text-cata-text">
                      {nivelLabel(niveles, c.nivelRankingId)}
                    </td>
                    <td className="px-4 py-3 text-cata-text/65">
                      {c.anio}-{String(c.mes).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3 text-right text-cata-text/65">{c.personasProcesadas}</td>
                    <td className="px-4 py-3 text-right text-cata-text/65">{c.personasEliminadas.length}</td>
                    <td className="px-4 py-3 text-cata-text/45">{c.cerradoPor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        variant="danger"
        title="Cerrar mes de ranking"
        message={`¿Confirmás el cierre del mes ${periodo} para ${nivelLabel(niveles, nivelId ? Number(nivelId) : null)}? Esta acción es irreversible.`}
        confirmLabel="Cerrar mes"
        onConfirm={handleConfirmClose}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
