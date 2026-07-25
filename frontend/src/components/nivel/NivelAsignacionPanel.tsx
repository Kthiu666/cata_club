/**
 * Nivel assignment panel — shared between the trainer's `/trainer/nivel` and
 * the admin's `/ranking` screens (extracted to eliminate duplication; same
 * pattern as `SeleccionOficialPanel`).
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
 *
 * Real backend gap for the admin actor (do not work around — documented at
 * the source instead of guessed here): initial group assignment (`POST
 * /ranking/asignar-nivel-inicial`) is backend-restricted to ENTRENADOR — an
 * ADMINISTRADOR gets a real 403. Moving an already-assigned student (`PATCH
 * /ranking/mover-de-nivel`) works fine for admins.
 *
 * ## Design-system migration
 *
 * This file came back from upstream still speaking the pre-redesign dialect —
 * `cata-text`, `cata-border`, `cata-bg`, `btn-secondary`, hand-rolled table
 * markup and a hand-rolled pager. It now uses the shared primitives, so the
 * screen inherits the committed metrics (40px controls, 32px in-table
 * controls, 26px badges, 14/10 radii) instead of restating them by eye.
 *
 * The one judgement call: the "Nivel actual" column used a sky/violet/fuchsia
 * ramp keyed on `nivelCategoria`. Three saturated hues that belong to no
 * product token, encoding a category the user cannot act on, on a screen whose
 * governing rule (see `NivelLadder`) is that a nivel is identified by its NAME
 * and nothing else. It is now a neutral badge carrying that name, and the
 * absence of one is muted text rather than a fourth colour — an unassigned
 * student has no nivel, so there is no chip to draw.
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import BackLink from "@/components/BackLink";
import { Users, CheckCircle2, GraduationCap } from "lucide-react";
import {
  fetchAlumnosConNivel,
  fetchNivelesConOcupacion,
  assignStudentToNivel,
  moveStudentToNivel,
  ApiClientError,
  type NivelConOcupacion,
  type AlumnoConNivel,
} from "@/services/api";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { useToast } from "@/contexts/ToastContext";
import {
  buildNivelStudentsFromAlumnos,
  type NivelStudentRef,
} from "@/app/trainer/nivel/nivel-utils";
import { paginateRecords, getTotalPages } from "@/app/attendance/attendance-utils";
import type { UserRole } from "@/types/domain";

/** Tamaño de página para la lista de estudiantes (Nivel). */
const NIVEL_PAGE_SIZE = 10;

/** The club's own name for a nivel — the only label this screen ever shows. */
function nivelLabel(niveles: NivelConOcupacion[], nivelId: number): string {
  const nivel = niveles.find((n) => n.id === nivelId);
  if (!nivel) return `Nivel ${nivelId}`;
  return nivel.nombre ?? String(nivel.numeroNivel);
}

export interface NivelAsignacionPanelProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly allowedRoles: UserRole[];
  readonly backHref: string;
  readonly backLabel: string;
}

export default function NivelAsignacionPanel({
  eyebrow,
  title,
  allowedRoles,
  backHref,
  backLabel,
}: NivelAsignacionPanelProps): React.ReactElement {
  const [alumnos, setAlumnos] = useState<AlumnoConNivel[]>([]);
  const [niveles, setNiveles] = useState<NivelConOcupacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const alumnosRef = useRef(alumnos);
  alumnosRef.current = alumnos;

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      const [alumnosData, nivelesData] = await Promise.all([
        fetchAlumnosConNivel(),
        fetchNivelesConOcupacion(),
      ]);
      setAlumnos(alumnosData);
      setNiveles(nivelesData);
    } catch {
      setLoadError("No se pudieron cargar los estudiantes. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  const silentRefresh = useCallback(async (): Promise<void> => {
    try {
      const [alumnosData, nivelesData] = await Promise.all([
        fetchAlumnosConNivel(),
        fetchNivelesConOcupacion(),
      ]);
      setAlumnos(alumnosData);
      setNiveles(nivelesData);
    } catch {
      /* swallow — data is stale but functional */
    }
  }, []);

  const handleOptimisticAssign = useCallback(
    (studentId: string, newNivelId: number) => {
      const numericId = Number(studentId);
      const current = alumnosRef.current.find((a) => a.personaId === numericId);
      const oldNivelId = current?.nivelRankingId ?? null;

      setAlumnos((prev) =>
        prev.map((a) =>
          a.personaId === numericId ? { ...a, nivelRankingId: newNivelId } : a,
        ),
      );

      setNiveles((prev) =>
        prev.map((n) => {
          if (oldNivelId !== null && n.id === oldNivelId) {
            return {
              ...n,
              personasActuales: Math.max(0, n.personasActuales - 1),
              cuposDisponibles: n.cuposDisponibles + 1,
            };
          }
          if (n.id === newNivelId) {
            return {
              ...n,
              personasActuales: n.personasActuales + 1,
              cuposDisponibles: Math.max(0, n.cuposDisponibles - 1),
            };
          }
          return n;
        }),
      );
    },
    [],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const students = buildNivelStudentsFromAlumnos(alumnos);

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <AppShell eyebrow={eyebrow} title={title}>
        <BackLink href={backHref} label={backLabel} />

        {loadError && (
          <ErrorState className="mb-6" message={loadError} onRetry={() => void loadData()} />
        )}

        <AsignarNivelTab
          students={students}
          niveles={niveles}
          loading={loading}
          onOptimisticAssign={handleOptimisticAssign}
          onBackgroundRefresh={silentRefresh}
        />
      </AppShell>
    </ProtectedRoute>
  );
}

// ---------------------------------------------------------------------------
// Tab 1 — Asignar Nivel
// ---------------------------------------------------------------------------

interface AsignarNivelTabProps {
  students: NivelStudentRef[];
  niveles: NivelConOcupacion[];
  loading: boolean;
  onOptimisticAssign: (studentId: string, newNivelId: number) => void;
  onBackgroundRefresh: () => Promise<void>;
}

const NIVEL_FILTER_UNASSIGNED = "sin-asignar";

/** How long the "Asignado" label stays on the row before reverting to "Asignar". */
const SUCCESS_RESET_DELAY_MS = 2000;

function AsignarNivelTab({ students, niveles, loading, onOptimisticAssign, onBackgroundRefresh }: AsignarNivelTabProps): React.ReactElement {
  const { showSuccess, showError } = useToast();
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Which rows currently show "Asignado". A Set (not a single id) because two
  // students can complete an assignment within each other's reset window —
  // each row's "Asignado" state must revert independently.
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [nivelFilter, setNivelFilter] = useState("");
  const [page, setPage] = useState(1);
  // One reset timer per student (keyed by estudianteId), not a single shared
  // ref — otherwise a second student's assignment completing overwrites the
  // ref before the first student's timer is cleared, leaving it orphaned:
  // it still fires and clears `successId` unconditionally, hiding the
  // second student's "Asignado" before that student's own 2s window elapses.
  const resetTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clear every pending "Asignado" reset timer on unmount so no state update
  // fires after the component is gone.
  useEffect(() => {
    const timers = resetTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

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

  /** Resetea a página 1 cada vez que cambian los filtros o los datos. */
  useEffect(() => {
    setPage(1);
  }, [filteredStudents.length, searchTerm, nivelFilter]);

  const totalPages = useMemo(
    () => getTotalPages(filteredStudents.length, NIVEL_PAGE_SIZE),
    [filteredStudents.length],
  );
  const paginatedStudents = useMemo(
    () => paginateRecords(filteredStudents, page, NIVEL_PAGE_SIZE),
    [filteredStudents, page],
  );

  async function handleAssign(estudianteId: string): Promise<void> {
    const nivelId = drafts[estudianteId];
    if (!nivelId) return;

    const student = students.find((s) => s.id === estudianteId);
    setSavingId(estudianteId);
    setError(null);
    setSuccessIds((prev) => {
      if (!prev.has(estudianteId)) return prev;
      const next = new Set(prev);
      next.delete(estudianteId);
      return next;
    });
    const pendingTimer = resetTimersRef.current.get(estudianteId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      resetTimersRef.current.delete(estudianteId);
    }
    try {
      if (student?.nivelRankingId === null || student?.nivelRankingId === undefined) {
        await assignStudentToNivel(Number(estudianteId), nivelId);
      } else {
        await moveStudentToNivel(Number(estudianteId), nivelId);
      }
      onOptimisticAssign(estudianteId, nivelId);
      setSuccessIds((prev) => new Set(prev).add(estudianteId));
      showSuccess("Nivel asignado correctamente.");
      void onBackgroundRefresh();
      const timer = setTimeout(() => {
        setSuccessIds((prev) => {
          if (!prev.has(estudianteId)) return prev;
          const next = new Set(prev);
          next.delete(estudianteId);
          return next;
        });
        resetTimersRef.current.delete(estudianteId);
      }, SUCCESS_RESET_DELAY_MS);
      resetTimersRef.current.set(estudianteId, timer);
    } catch (err) {
      console.error("[nivel] assign/move nivel failed", err);
      const message = err instanceof ApiClientError ? err.message : "Error al asignar el nivel.";
      setError(message);
      showError(message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} strokeWidth={1.5} className="flex-none text-ink-2" aria-hidden="true" />
          <h2 className="text-[13px] font-bold text-ink">
            Estudiantes ({filteredStudents.length})
          </h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput
            className="w-full sm:w-56"
            label="Buscar estudiante por nombre"
            placeholder="Buscar por nombre…"
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <select
            aria-label="Filtrar por nivel actual"
            className="input-field h-ctl w-full sm:w-40"
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
        <p className="px-5 pt-4 text-[12.5px] text-state-bad" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <LoadingState label="Cargando estudiantes…" />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<Users size={21} strokeWidth={1.5} aria-hidden="true" />}
          title="Todavía no hay estudiantes"
          description="Cuando el club registre a su primer estudiante, aparecerá aquí."
        />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users size={21} strokeWidth={1.5} aria-hidden="true" />}
          title="Ningún estudiante coincide"
          description="Revise el nombre o cambie el filtro de nivel para ver más estudiantes."
        />
      ) : (
        // `relative` is load-bearing, not decoration. The "Acción" column's
        // header is an `sr-only` span, and `sr-only` is `position:absolute`.
        // With no positioned ancestor its containing block was the initial
        // one, so it escaped BOTH this scroller and the card's
        // `overflow-hidden` and sat at x=513 on a 375px viewport — 139px of
        // page-level horizontal scroll on a phone, from a 1px invisible span.
        // Making the scroller its containing block clips it where it belongs.
        <div className="relative overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Estudiante</TableHeaderCell>
                <TableHeaderCell>Nivel actual</TableHeaderCell>
                <TableHeaderCell>Nuevo nivel</TableHeaderCell>
                <TableHeaderCell align="right">
                  <span className="sr-only">Acción</span>
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedStudents.map((student) => (
                <TableRow key={student.id} className="transition-colors hover:bg-sunken">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-canvas">
                        <GraduationCap
                          size={14}
                          strokeWidth={1.5}
                          className="text-ink-2"
                          aria-hidden="true"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="text-sm font-semibold text-ink">
                          {student.nombres} {student.apellidos}
                        </span>
                        {!student.activo && (
                          <span className="ml-2 inline-flex h-badge items-center rounded-full bg-canvas px-2 text-[11.5px] font-semibold text-ink-3">
                            Inactivo
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.nivelRankingId === null ? (
                      <span className="text-[12.5px] text-ink-3">Sin asignar</span>
                    ) : (
                      <Badge tone="neutral">{nivelLabel(niveles, student.nivelRankingId)}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {/* In-table control — 32px, not the 40px page control. */}
                    <select
                      aria-label={`Nuevo nivel para ${student.nombres} ${student.apellidos}`}
                      className="input-field h-ctl-sm w-28 py-0 text-[12.5px]"
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
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="sm"
                      disabled={!drafts[student.id] || savingId === student.id}
                      onClick={() => handleAssign(student.id)}
                    >
                      {savingId === student.id ? (
                        "Guardando…"
                      ) : successIds.has(student.id) ? (
                        <>
                          <CheckCircle2 size={12} strokeWidth={2} aria-hidden="true" />
                          Asignado
                        </>
                      ) : (
                        "Asignar"
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && filteredStudents.length > NIVEL_PAGE_SIZE && (
        <Pagination
          className="border-t border-line px-5 py-4"
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filteredStudents.length}
          pageSize={NIVEL_PAGE_SIZE}
          itemNoun="estudiante"
        />
      )}
    </div>
  );
}
