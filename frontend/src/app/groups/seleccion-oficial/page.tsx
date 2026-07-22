/**
 * Selección Oficial — admin-managed roster page (Ranking track).
 *
 * Dedicated route (PR9), extracted from an anchor-jump section that used to
 * live inside `groups/page.tsx` (`#seleccion-oficial`). PR4 added a
 * smooth-scroll + brief-highlight effect to soften the jump; the app owner
 * live-tested it and said it still felt like an abrupt context switch, so
 * it now gets its own dedicated screen instead.
 *
 * Roster is fetched from the backend (GET /ranking/seleccion-oficial) and
 * displayed with a "Quitar" button to remove members (DELETE).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import { Award, AlertTriangle, X } from "lucide-react";
import {
  fetchMembers,
  seleccionOficial,
  fetchSeleccionOficial,
  quitarDeSeleccionOficial,
  ApiClientError,
  extractItems,
} from "@/services/api";
import type { SeleccionOficialRosterItem } from "@/services/api";
import type { StudentRef } from "@/lib/groups-utils";

export default function SeleccionOficialPage(): React.ReactElement {
  const [allStudents, setAllStudents] = useState<StudentRef[]>([]);
  const [roster, setRoster] = useState<SeleccionOficialRosterItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [seleccionEstudianteId, setSeleccionEstudianteId] = useState("");
  const [seleccionLoading, setSeleccionLoading] = useState(false);
  const [seleccionError, setSeleccionError] = useState<string | null>(null);

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

  const loadRoster = useCallback(async (): Promise<void> => {
    try {
      const data = await fetchSeleccionOficial();
      setRoster(extractItems(data));
    } catch {
      // Silently fail — the roster table just won't show persisted entries
    }
  }, []);

  useEffect(() => {
    void loadStudents();
    void loadRoster();
  }, [loadStudents, loadRoster]);

  async function handleSeleccionOficialSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSeleccionError(null);

    if (!seleccionEstudianteId) {
      setSeleccionError("Seleccioná un estudiante.");
      return;
    }

    setSeleccionLoading(true);
    try {
      await seleccionOficial({ estudianteId: seleccionEstudianteId });
      setSeleccionEstudianteId("");
      await loadRoster();
    } catch (err) {
      console.error("[seleccion-oficial] seleccionOficial failed", err);
      setSeleccionError(
        err instanceof ApiClientError ? err.message : "Error al registrar la selección oficial.",
      );
    } finally {
      setSeleccionLoading(false);
    }
  }

  async function handleQuitar(personaId: number): Promise<void> {
    try {
      await quitarDeSeleccionOficial(personaId);
      setRoster((prev) => prev.filter((item) => item.persona_id !== personaId));
    } catch (err) {
      console.error("[seleccion-oficial] quitarDeSeleccionOficial failed", err);
      setSeleccionError(
        err instanceof ApiClientError ? err.message : "Error al quitar de la selección oficial.",
      );
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
            <label className="block text-sm sm:col-span-3">
              <span className="mb-1 block text-xs font-medium text-cata-text/65">Estudiante</span>
              <select
                className="input-field"
                value={seleccionEstudianteId}
                onChange={(e) => setSeleccionEstudianteId(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {allStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombres} {s.apellidos}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-4">
              <button type="submit" disabled={seleccionLoading} className="btn-primary">
                {seleccionLoading ? "Guardando..." : "Agregar a selección oficial"}
              </button>
            </div>
          </form>

          {roster.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cata-border bg-cata-bg text-xs font-medium uppercase tracking-wider text-cata-text/65">
                    <th className="px-4 py-2 font-medium">Estudiante</th>
                    <th className="px-4 py-2 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cata-border">
                  {roster.map((item) => (
                    <tr key={item.persona_id}>
                      <td className="px-4 py-2 text-cata-text">
                        {item.persona_nombre_completo}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => void handleQuitar(item.persona_id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-cata-red/20 bg-cata-red/10 px-2 py-1 text-xs font-medium text-cata-red transition-colors hover:bg-cata-red/20"
                          title={`Quitar ${item.persona_nombre_completo} de la selección oficial`}
                        >
                          <X size={12} strokeWidth={2} aria-hidden="true" />
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
