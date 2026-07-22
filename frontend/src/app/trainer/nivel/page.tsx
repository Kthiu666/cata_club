/**
 * Nivel — Trainer page for managing student nivel assignment.
 *
 * Assigns/moves each student's nivel (initial assignment via
 * `asignar-nivel-inicial`, re-assignment via `mover-de-nivel`).
 *
 * The nivel a student is assigned to IS the same `nivel_ranking` record used
 * by Grupo/`NivelTecnico` (see src/app/groups/page.tsx) — the backend only
 * has one such table, fetched here via the same
 * fetchNivelesConOcupacion()/fetchMembers() calls groups.tsx uses. Mutating
 * actions call the real backend endpoints (assignStudentToNivel/
 * moveStudentToNivel, same functions groups.tsx uses), so after a successful
 * assignment the member list is reloaded to reflect the student's new nivel.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Trophy, Users, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  fetchMembers,
  assignStudentToNivel,
  moveStudentToNivel,
  ApiClientError,
  type NivelConOcupacion,
} from "@/services/api";
import { buildNivelStudents } from "./nivel-utils";

function nivelLabel(niveles: NivelConOcupacion[], nivelId: number | null): string {
  if (nivelId === null) return "Sin asignar";
  const nivel = niveles.find((n) => n.id === nivelId);
  return nivel ? nivel.nombre ?? String(nivel.numeroNivel) : `Nivel ${nivelId}`;
}

export default function NivelPage(): React.ReactElement {
  const [members, setMembers] = useState<Awaited<ReturnType<typeof fetchMembers>>["accounts"]>([]);
  const [niveles, setNiveles] = useState<NivelConOcupacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const students = buildNivelStudents(members);

  return (
    <ProtectedRoute allowedRoles={["trainer"]}>
      <div>
        {/* Hero Banner */}
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-cata-border bg-cata-surface px-6 py-10 shadow-elevated sm:px-10 sm:py-12">
          <div className="absolute inset-0 bg-logo-glow" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
              <Trophy size={14} strokeWidth={2} aria-hidden="true" />
              Gestión de Nivel
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-cata-text sm:text-4xl">
              Nivel
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-cata-text/60">
              Asigná el nivel de cada estudiante.
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

        <AsignarNivelTab
          students={students}
          niveles={niveles}
          loading={loading}
          onAssigned={loadData}
        />
      </div>
    </ProtectedRoute>
  );
}

// ---------------------------------------------------------------------------
// Tab 1 — Asignar Nivel
// ---------------------------------------------------------------------------

interface AsignarNivelTabProps {
  students: ReturnType<typeof buildNivelStudents>;
  niveles: NivelConOcupacion[];
  loading: boolean;
  onAssigned: () => Promise<void>;
}

const NIVEL_FILTER_UNASSIGNED = "sin-asignar";

function AsignarNivelTab({ students, niveles, loading, onAssigned }: AsignarNivelTabProps): React.ReactElement {
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [nivelFilter, setNivelFilter] = useState("");

  const filteredStudents = students.filter((student) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      term === "" ||
      `${student.nombres} ${student.apellidos}`.toLowerCase().includes(term);

    const matchesNivel =
      nivelFilter === "" ||
      (nivelFilter === NIVEL_FILTER_UNASSIGNED
        ? student.nivelRankingId === null
        : student.nivelRankingId === Number(nivelFilter));

    return matchesSearch && matchesNivel;
  });

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
      console.error("[nivel] assign/move nivel failed", err);
      setError(
        err instanceof ApiClientError ? err.message : "Error al asignar el nivel.",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-cata-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-sm font-bold text-cata-text">Estudiantes ({filteredStudents.length})</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            aria-label="Buscar estudiante por nombre"
            placeholder="Buscar por nombre…"
            className="input-field w-full sm:w-48"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            aria-label="Filtrar por nivel actual"
            className="input-field w-full sm:w-40"
            value={nivelFilter}
            onChange={(e) => setNivelFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value={NIVEL_FILTER_UNASSIGNED}>Sin asignar</option>
            {niveles.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre ?? n.numeroNivel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="alert-error mx-5 mt-4" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-sm text-cata-text/50">Cargando estudiantes…</p>
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Users size={32} strokeWidth={1.5} className="mb-3 text-cata-text/20" aria-hidden="true" />
          <p className="text-sm text-cata-text/50">No hay estudiantes registrados.</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Users size={32} strokeWidth={1.5} className="mb-3 text-cata-text/20" aria-hidden="true" />
          <p className="text-sm text-cata-text/50">No se encontraron estudiantes con ese criterio.</p>
        </div>
      ) : (
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
              {filteredStudents.map((student) => (
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
                    {nivelLabel(niveles, student.nivelRankingId)}
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

