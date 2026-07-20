/**
 * Ranking (Track Ranking) — Trainer page for managing the competitive
 * ranking system.
 *
 * Three tabs:
 *  - Asignar Nivel: assign/edit each student's ranking category (1–10).
 *  - Resultados Mensuales: register a monthly result for a student.
 *  - Cierre de Mes: close out the current ranking month for a category
 *    (irreversible — confirmed before submitting).
 *
 * `CategoriaRanking` (1–10) is a SEPARATE, unrelated taxonomy from
 * `NivelTecnico` (the club's technical-level/horario concept used by
 * Grupo — see src/app/groups/page.tsx). Do not conflate the two.
 *
 * Data is loaded from the real backend via BFF GET proxies on mount.
 */

"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Trophy,
  ListChecks,
  Lock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
} from "lucide-react";
import type { CategoriaRanking } from "@/types/domain";
import type {
  AsignacionRanking,
  ResultadoMensualRanking,
  CierreMensualRanking,
} from "@/services/api";
import {
  registrarResultadoMensual,
  cerrarMes,
  asignarNivel,
  fetchAsignacionesRanking,
  fetchResultadosMensualesRanking,
  fetchCierresMensualesRanking,
  ApiClientError,
} from "@/services/api";
import {
  CATEGORIA_OPTIONS,
  isValidPeriodo,
  currentPeriodo,
  type RankingStudentRef,
} from "./ranking-utils";

type TabKey = "asignar" | "resultados" | "cierre";

const TABS: { key: TabKey; label: string }[] = [
  { key: "asignar", label: "Asignar Nivel" },
  { key: "resultados", label: "Resultados Mensuales" },
  { key: "cierre", label: "Cierre de Mes" },
];

function buildStudentsFromAsignaciones(
  asignaciones: AsignacionRanking[],
  categoriasOverride: Record<string, CategoriaRanking>,
): RankingStudentRef[] {
  return asignaciones.map((a) => ({
    id: String(a.persona_id),
    nombres: a.persona_nombre_completo.split(" ")[0] ?? "",
    apellidos: a.persona_nombre_completo.split(" ").slice(1).join(" "),
    activo: a.esta_en_ranking,
    categoria: categoriasOverride[String(a.persona_id)] ?? a.nivel_ranking_numero,
  }));
}

function formatBackendPeriodo(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

export default function RankingPage(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabKey>("asignar");

  const [asignaciones, setAsignaciones] = useState<AsignacionRanking[]>([]);
  const [resultados, setResultados] = useState<ResultadoMensualRanking[]>([]);
  const [cierres, setCierres] = useState<CierreMensualRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Local overrides from successful actions (optimistic)
  const [categorias, setCategorias] = useState<Record<string, CategoriaRanking>>({});

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      setLoadError(null);
      try {
        const [asig, res, cie] = await Promise.all([
          fetchAsignacionesRanking(),
          fetchResultadosMensualesRanking(),
          fetchCierresMensualesRanking(),
        ]);
        if (!cancelled) {
          setAsignaciones(asig);
          setResultados(res);
          setCierres(cie);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiClientError
              ? err.message
              : "Error al cargar datos de ranking.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const students = buildStudentsFromAsignaciones(asignaciones, categorias);

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
              Asigná categorías de ranking (1–10), registrá resultados mensuales y cerrá el mes
              por categoría. La categoría de ranking es independiente del nivel técnico del grupo.
            </p>
          </div>
        </div>

        {loading && (
          <div className="mb-6 text-xs text-cata-text/50">Cargando datos de ranking...</div>
        )}
        {loadError && (
          <div className="alert-error mb-6" role="alert">{loadError}</div>
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
          <AsignarNivelTab students={students} onAssigned={(estudianteId, nivelNumero) => {
            setCategorias((prev) => ({ ...prev, [estudianteId]: nivelNumero }));
          }} />
        )}

        {activeTab === "resultados" && (
          <ResultadosMensualesTab
            students={students}
            resultados={resultados}
            onRegistered={(r) => setResultados((prev) => [r, ...prev])}
          />
        )}

        {activeTab === "cierre" && (
          <CierreMesTab
            cierres={cierres}
            onClosed={() => {
              fetchCierresMensualesRanking().then(setCierres).catch(() => {});
            }}
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
  students: RankingStudentRef[];
  onAssigned: (estudianteId: string, nivelNumero: CategoriaRanking) => void;
}

function AsignarNivelTab({ students, onAssigned }: AsignarNivelTabProps): React.ReactElement {
  const [drafts, setDrafts] = useState<Record<string, CategoriaRanking>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  async function handleAssign(estudianteId: string): Promise<void> {
    const categoria = drafts[estudianteId];
    if (!categoria) return;

    setSavingId(estudianteId);
    setError(null);
    setSuccessId(null);
    try {
      await asignarNivel(categoria, { estudianteId });
      onAssigned(estudianteId, categoria);
      setSuccessId(estudianteId);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Error al asignar la categoría de ranking.",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-cata-border px-5 py-4">
        <Users size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
        <h2 className="text-sm font-bold text-cata-text">Estudiantes ({students.length})</h2>
      </div>

      {error && (
        <div className="alert-error mx-5 mt-4" role="alert">
          {error}
        </div>
      )}

      {students.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Users size={32} strokeWidth={1.5} className="mb-3 text-cata-text/20" aria-hidden="true" />
          <p className="text-sm text-cata-text/50">No hay estudiantes en el ranking.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                <th className="px-4 py-3 font-medium">Estudiante</th>
                <th className="px-4 py-3 font-medium">Categoría actual</th>
                <th className="px-4 py-3 font-medium">Nueva categoría</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cata-border">
              {students.map((student) => (
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
                    {student.categoria ?? <span className="text-cata-text/30">Sin asignar</span>}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Nueva categoría para ${student.nombres} ${student.apellidos}`}
                      className="input-field w-24 py-1.5 text-sm"
                      value={drafts[student.id] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [student.id]: Number(e.target.value) }))
                      }
                    >
                      <option value="">—</option>
                      {CATEGORIA_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
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
                      {savingId === student.id ? (
                        "Guardando..."
                      ) : successId === student.id ? (
                        <>
                          <CheckCircle2 size={12} strokeWidth={2} aria-hidden="true" />
                          Asignado
                        </>
                      ) : (
                        "Asignar"
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2 — Resultados Mensuales
// ---------------------------------------------------------------------------

interface ResultadosMensualesTabProps {
  students: RankingStudentRef[];
  resultados: ResultadoMensualRanking[];
  onRegistered: (resultado: ResultadoMensualRanking) => void;
}

function ResultadosMensualesTab({
  students,
  resultados,
  onRegistered,
}: ResultadosMensualesTabProps): React.ReactElement {
  const [estudianteId, setEstudianteId] = useState("");
  const [categoria, setCategoria] = useState<CategoriaRanking | "">("");
  const [periodo, setPeriodo] = useState(currentPeriodo());
  const [puntos, setPuntos] = useState("");
  const [observacion, setObservacion] = useState("");
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
    if (!categoria) {
      setValidationError("Seleccioná una categoría (1–10).");
      return;
    }
    if (!isValidPeriodo(periodo)) {
      setValidationError('El período debe tener el formato "YYYY-MM".');
      return;
    }
    const puntosNum = Number(puntos);
    if (puntos.trim() === "" || !Number.isFinite(puntosNum)) {
      setValidationError("Los puntos deben ser un número.");
      return;
    }
    setValidationError(null);

    setSubmitting(true);
    try {
      await registrarResultadoMensual({
        estudianteId,
        categoria,
        periodo,
        puntos: puntosNum,
        observacion: observacion.trim() || undefined,
      });
      // Optimistic: add a placeholder result so the table updates immediately
      const [anioStr, mesStr] = periodo.split("-");
      const optimResult: ResultadoMensualRanking = {
        id: Date.now(),
        persona_id: Number(estudianteId),
        persona_nombre_completo: students.find((s) => s.id === estudianteId)
          ? `${students.find((s) => s.id === estudianteId)!.nombres} ${students.find((s) => s.id === estudianteId)!.apellidos}`
          : estudianteId,
        nivel_ranking_id: 0,
        nivel_ranking_nombre: null,
        anio: Number(anioStr),
        mes: Number(mesStr),
        posicion: Math.max(1, Math.round(puntosNum)),
        puntos_obtenidos: puntosNum,
        participo: true,
        ausencia_justificada: false,
      };
      onRegistered(optimResult);
      setSuccessMessage("Resultado mensual registrado correctamente.");
      setPuntos("");
      setObservacion("");
    } catch (err) {
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
            <span className="mb-1 block text-xs font-medium text-cata-text/65">Categoría</span>
            <select
              className="input-field"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Seleccionar...</option>
              {CATEGORIA_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
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
            <span className="mb-1 block text-xs font-medium text-cata-text/65">Puntos</span>
            <input
              type="number"
              className="input-field"
              value={puntos}
              onChange={(e) => setPuntos(e.target.value)}
              placeholder="0"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-cata-text/65">
            Observación (opcional)
          </span>
          <input
            type="text"
            className="input-field"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Notas sobre el resultado..."
          />
        </label>

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
            <p className="text-sm text-cata-text/50">No hay resultados registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                  <th className="px-4 py-3 font-medium">Estudiante</th>
                  <th className="px-4 py-3 font-medium">Nivel</th>
                  <th className="px-4 py-3 font-medium">Período</th>
                  <th className="px-4 py-3 font-medium text-right">Puntos</th>
                  <th className="px-4 py-3 font-medium">Participó</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cata-border">
                {resultados.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-cata-text">
                      {r.persona_nombre_completo}
                    </td>
                    <td className="px-4 py-3 text-cata-text/65">
                      {r.nivel_ranking_nombre ?? r.nivel_ranking_id}
                    </td>
                    <td className="px-4 py-3 text-cata-text/65">
                      {formatBackendPeriodo(r.anio, r.mes)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-cata-text">
                      {r.puntos_obtenidos}
                    </td>
                    <td className="px-4 py-3 text-cata-text/45">
                      {r.participo ? "Sí" : "No"}
                    </td>
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
  cierres: CierreMensualRanking[];
  onClosed: () => void;
}

function CierreMesTab({ cierres, onClosed }: CierreMesTabProps): React.ReactElement {
  const [nivelId, setNivelId] = useState<string>("");
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
      setValidationError("Seleccioná un nivel de ranking.");
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
      await cerrarMes(Number(nivelId), { periodo });
      onClosed();
      setSuccessMessage(`Mes ${periodo} cerrado correctamente.`);
    } catch (err) {
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
            <span className="mb-1 block text-xs font-medium text-cata-text/65">Nivel de ranking</span>
            <select
              className="input-field"
              value={nivelId}
              onChange={(e) => setNivelId(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {CATEGORIA_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  Nivel {c}
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
            <p className="text-sm text-cata-text/50">No se cerró ningún mes aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                  <th className="px-4 py-3 font-medium">Nivel</th>
                  <th className="px-4 py-3 font-medium">Período</th>
                  <th className="px-4 py-3 font-medium">Procesados</th>
                  <th className="px-4 py-3 font-medium">Cerrado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cata-border">
                {cierres.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium text-cata-text">
                      {c.nivel_ranking_nombre ?? `Nivel ${c.nivel_ranking_numero}`}
                    </td>
                    <td className="px-4 py-3 text-cata-text/65">
                      {formatBackendPeriodo(c.anio, c.mes)}
                    </td>
                    <td className="px-4 py-3 text-cata-text/65">{c.personas_procesadas}</td>
                    <td className="px-4 py-3 text-cata-text/45">{c.cerrado_por_nombre}</td>
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
        message={`¿Confirmás el cierre del mes ${periodo} para el nivel ${nivelId}? Esta acción es irreversible.`}
        confirmLabel="Cerrar mes"
        onConfirm={handleConfirmClose}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
