/**
 * Selección Oficial — admin-managed roster page (Ranking track).
 *
 * Dedicated route (PR9), extracted from an anchor-jump section that used to
 * live inside `groups/page.tsx` (`#seleccion-oficial`). PR4 added a
 * smooth-scroll + brief-highlight effect to soften the jump; the app owner
 * live-tested it and said it still felt like an abrupt context switch, so
 * it now gets its own dedicated screen instead.
 *
 * Frontend-only session list — same reasoning as `groups/page.tsx`'s
 * Reingreso section: there's no backend GET yet to refresh the roster, so
 * entries added this session are tracked locally. Data layer (types, API
 * call) is unchanged — see `@/services/api`'s `seleccionOficial` and
 * `src/app/api/ranking/seleccion-oficial/route.ts`.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import Pagination from "@/components/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { Award, AlertTriangle } from "lucide-react";
import { fetchMembers, seleccionOficial, ApiClientError } from "@/services/api";
import type { CategoriaRanking, SeleccionOficial } from "@/types/domain";
import type { StudentRef } from "@/lib/groups-utils";

export default function SeleccionOficialPage(): React.ReactElement {
  const [allStudents, setAllStudents] = useState<StudentRef[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [seleccionEstudianteId, setSeleccionEstudianteId] = useState("");
  const [seleccionCategoria, setSeleccionCategoria] = useState<CategoriaRanking | "">("");
  const [seleccionPeriodo, setSeleccionPeriodo] = useState("");
  const [seleccionLoading, setSeleccionLoading] = useState(false);
  const [seleccionError, setSeleccionError] = useState<string | null>(null);
  const [seleccionesOficiales, setSeleccionesOficiales] = useState<SeleccionOficial[]>([]);

  const loadStudents = useCallback(async (): Promise<void> => {
    setLoadError(null);
    try {
      const { accounts: members } = await fetchMembers();
      const students: StudentRef[] = members.flatMap((account) =>
        account.estudiantes.map((estudiante) => ({
          id: estudiante.id,
          nombres: estudiante.nombres,
          apellidos: estudiante.apellidos,
          grupoId: estudiante.grupoId,
          activo: estudiante.activo,
        })),
      );
      setAllStudents(students);
    } catch {
      setLoadError("No se pudieron cargar los estudiantes. Intente nuevamente.");
    }
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  // In-scope list (spec row #9): the "todos los estudiantes" selector.
  // The `seleccionesOficiales` roster table below is explicitly OUT of
  // scope — it's frontend-only session state with no backend GET endpoint
  // to paginate against (missing-feature gap, not a pagination gap).
  const {
    page: studentsPage,
    totalPages: studentsTotalPages,
    currentItems: paginatedStudents,
    setPage: setStudentsPage,
  } = usePagination({ records: allStudents });

  async function handleSeleccionOficialSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSeleccionError(null);

    if (!seleccionEstudianteId || !seleccionCategoria || !seleccionPeriodo) {
      setSeleccionError("Completá estudiante, categoría y período.");
      return;
    }

    setSeleccionLoading(true);
    try {
      const entry = await seleccionOficial({
        estudianteId: seleccionEstudianteId,
        categoria: seleccionCategoria,
        periodo: seleccionPeriodo,
      });
      setSeleccionesOficiales((prev) => [entry, ...prev]);
      setSeleccionEstudianteId("");
      setSeleccionCategoria("");
      setSeleccionPeriodo("");
    } catch (err) {
      console.error("[seleccion-oficial] seleccionOficial failed", err);
      setSeleccionError(
        err instanceof ApiClientError ? err.message : "Error al registrar la selección oficial.",
      );
    } finally {
      setSeleccionLoading(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AppShell
        eyebrow="Grupos de Entrenamiento"
        title="Selección Oficial"
      >
        {loadError && (
          <div
            className="mb-4 flex items-center gap-2 rounded-xl border border-cata-red/30 bg-cata-red/10 px-4 py-3 text-sm text-cata-red"
            role="alert"
          >
            <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
            {loadError}
            <button type="button" onClick={() => void loadStudents()} className="btn-ghost ml-auto text-xs">
              Reintentar
            </button>
          </div>
        )}

        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Award size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-sm font-bold text-cata-text">Selección Oficial</h3>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-cata-text/65">
            Roster de selección oficial gestionado por administración — independiente del flujo
            mensual de ranking a cargo del entrenador.
          </p>

          {seleccionError && (
            <div className="alert-error mb-4" role="alert">
              {seleccionError}
            </div>
          )}

          <form
            onSubmit={handleSeleccionOficialSubmit}
            className="mb-5 grid gap-3 sm:grid-cols-4"
          >
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-cata-text/65">Estudiante</span>
              <select
                className="input-field"
                value={seleccionEstudianteId}
                onChange={(e) => setSeleccionEstudianteId(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {paginatedStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombres} {s.apellidos}
                  </option>
                ))}
              </select>
              <Pagination page={studentsPage} totalPages={studentsTotalPages} onPageChange={setStudentsPage} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-cata-text/65">Categoría</span>
              <select
                className="input-field"
                value={seleccionCategoria}
                onChange={(e) =>
                  setSeleccionCategoria(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">—</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
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
                value={seleccionPeriodo}
                onChange={(e) => setSeleccionPeriodo(e.target.value)}
              />
            </label>
            <div className="sm:col-span-4">
              <button type="submit" disabled={seleccionLoading} className="btn-primary">
                {seleccionLoading ? "Guardando..." : "Agregar a selección oficial"}
              </button>
            </div>
          </form>

          {seleccionesOficiales.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                    <th className="px-4 py-2 font-medium">Estudiante</th>
                    <th className="px-4 py-2 font-medium">Categoría</th>
                    <th className="px-4 py-2 font-medium">Período</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cata-border">
                  {seleccionesOficiales.map((entry) => {
                    const student = allStudents.find((s) => s.id === entry.estudianteId);
                    return (
                      <tr key={entry.id}>
                        <td className="px-4 py-2 text-cata-text">
                          {student ? `${student.nombres} ${student.apellidos}` : entry.estudianteId}
                        </td>
                        <td className="px-4 py-2 text-cata-text/65">{entry.categoria}</td>
                        <td className="px-4 py-2 text-cata-text/65">{entry.periodo}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
