/**
 * Niveles — "la escalera".
 *
 * The audit's sharpest finding was about this screen: levels 1–10 with 1 at
 * the top is the club's proudest structure, and the interface rendered it as
 * a string picked from a `<select>` in a per-student table. Nothing in that
 * layout encoded that the scale is ordinal, that the first rung sits above the
 * last, or that moving up is an achievement. So the screen is the ladder
 * itself (`docs/ux/prototipos/13-niveles.html`): a vertical list with a
 * connecting rail, one rung per level, and assignment opening under the rung
 * it belongs to rather than hiding in a dropdown.
 *
 * v2 made the ladder a working tool. The metaphor was right and is untouched;
 * four things made it unusable against real data, and each has an answer here:
 *
 *   1. TWO NUMBERS PER RUNG. The club's ELEVEN levels are named "1A", "1B",
 *      "2" … "10" against ranks 1…11, so a chip reading "3" sat beside a name
 *      reading "2". The name now leads and is the only number rendered; the
 *      rank lives in the ordering, the rail and the node's "Puesto N" title.
 *      See `NivelLadder`'s header for the full rule.
 *   2. NO NAMES. 59 assigned students were shown as grey two-letter initials.
 *      Rungs carry real names now.
 *   3. NO WAY TO FIND ANYONE. The two real tasks are "where is Juan?" and
 *      "move Juan up a level". A page-level search answers the first by
 *      picking Juan out on his own rung, and the second by offering the move
 *      right there in the result row.
 *   4. THE UNASSIGNED WERE INVISIBLE. "59 de 67" named eight students it gave
 *      no way to see or act on. They are listed and actionable now — since v4,
 *      in the left column of every rung's panel (see B below).
 *
 * v3 answered the ORDER question — *"en nivel los paneles al revés, primero lo
 * que ya están asignados, y abajo los que no están asignados"* — by putting the
 * ladder first and a separate "Sin nivel asignado" block under it.
 *
 * v4 answers two more, and the second one absorbs that block:
 *
 *   A. THE HEADCOUNT. *"en nivel que también me salgan cuántos alumnos
 *      exactamente tienen ese nivel"*. Every rung states its count. It is a
 *      PLAIN COUNT — no denominator, no bar, no warning — see the occupancy
 *      rule below, which it does not breach.
 *   B. TWO COLUMNS ON EXPAND. *"no me convence la idea de mostrarlo directo en
 *      la barra horizontal, me gustaría que al desplegar se vean a la derecha
 *      los que están en el nivel y a la izquierda los que no tienen asignado
 *      ningún nivel"*. The roster left the rung; expanding a rung opens a
 *      two-column panel — unassigned LEFT, this level's roster RIGHT — so the
 *      assignment gesture is literally left-to-right.
 *
 *      That LEFT column is the v3 unassigned block, moved to where it is acted
 *      on. Keeping both would print the same nine students twice on one screen,
 *      once next to a level picker and once next to the level itself, so the
 *      standalone block is gone. The count survives in the stat hint; the
 *      students themselves are one rung-expand away, beside the rung that would
 *      receive them.
 *
 * WHICH COUNT IS TRUE. Two backend sources disagree: `GET /ranking/niveles`
 * reports `personasActuales` summing to 59, while `GET
 * /ranking/alumnos-con-nivel` returns 68 students of whom 58 hold a level (the
 * gap is one student on the rung named "2"). This screen reads the ROSTER and
 * only the roster — it is the source that NAMES the students, so a rung's
 * headcount is the length of the list the panel prints. `personasActuales`
 * would put "9 estudiantes" above eight names.
 *
 * Non-negotiable product rules baked in here:
 *   - NO occupancy. `NivelConOcupacion` carries `personasActuales`,
 *     `cuposDisponibles` and `necesitaRevision`; none of the three reaches the
 *     UI. The backend still computes them to validate capacity server-side. A
 *     headcount with no maximum beside it is not an occupancy indicator.
 *   - NO "Promover". A student with no level yet is "Asignar"
 *     (`POST /ranking/asignar-nivel-inicial`); one already on a rung is
 *     "Mover" (`PATCH /ranking/mover-de-nivel`). Two endpoints, and the word
 *     says which of the two the row will call — never a judgement about the
 *     direction of the change.
 *   - Two stats, no judgement: Estudiantes asignados and Niveles.
 *
 * NAME vs RANK still wants a product decision, though the screen no longer
 * depends on one: the club's names and `numero_nivel` diverge from the third
 * rung down, and the prototype's "1 es la cima" copy does not literally
 * describe a ladder whose bottom rung is NAMED "10" but ranked 11th. The stat
 * hint is derived from the top rung's real name instead of hardcoding "1".
 *
 * ROLE NOTE: initial assignment is open to ADMINISTRADOR and ENTRENADOR alike
 * (`ROL_ADMIN_O_ENTRENADOR` on `POST /ranking/asignar-nivel-inicial`), so an
 * admin can place the unassigned students this screen surfaces. An older note
 * here claimed the endpoint was trainer-only; the router says otherwise.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Trophy, Users } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import BackLink from "@/components/BackLink";
import NivelLadder, { type LadderRung } from "@/components/nivel/NivelLadder";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  SearchInput,
  StatCard,
} from "@/components/ui";
import { useToast } from "@/contexts/ToastContext";
import {
  ApiClientError,
  assignStudentToNivel,
  fetchAlumnosConNivel,
  fetchNivelesConOcupacion,
  moveStudentToNivel,
  type AlumnoConNivel,
  type NivelConOcupacion,
} from "@/services/api";
import {
  buildNivelStudentsFromAlumnos,
  type NivelStudentRef,
} from "@/app/trainer/nivel/nivel-utils";
import {
  filterStudentsByName,
  searchStudents,
  studentFullName,
  studentsOnNivel,
  unassignedStudents,
} from "./ranking-page-utils";

/** How long a row shows its success label before reverting to the verb. */
const SUCCESS_RESET_DELAY_MS = 2000;

/** Rows the rung's assignment panel renders before it asks you to search instead. */
const PANEL_VISIBLE_LIMIT = 12;

/**
 * The layout every "this person → that level" list uses. Two columns from `sm`
 * up, and no more: at 1440px that is ~545px per cell, which fits a name, the
 * 168px picker and the action with no dead space left over. A third column
 * measures ~379px and starts truncating names.
 */
const STUDENT_ROW_GRID = "grid gap-x-8 px-5 py-2 sm:grid-cols-2";

/** Display name for a level, falling back to its rank when unnamed. */
function nivelNombre(nivel: NivelConOcupacion): string {
  return nivel.nombre ?? `Nivel ${nivel.numeroNivel}`;
}

export default function RankingPage(): React.ReactElement {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <RankingContent />
    </ProtectedRoute>
  );
}

function RankingContent(): React.ReactElement {
  const { showSuccess, showError } = useToast();

  const [roster, setRoster] = useState<AlumnoConNivel[]>([]);
  const [niveles, setNiveles] = useState<NivelConOcupacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [openNivelId, setOpenNivelId] = useState<number | null>(null);
  /** The rung panel's own filter — scoped to "who do I add to THIS rung". */
  const [panelSearch, setPanelSearch] = useState("");
  /** The page-level person finder — "where is Juan, and move him". */
  const [studentSearch, setStudentSearch] = useState("");
  /** Target level picked per student in a direct assign/move row. */
  const [targetNivelIds, setTargetNivelIds] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [assignError, setAssignError] = useState<string | null>(null);

  // One reset timer per student, not a single shared ref: two assignments can
  // complete inside each other's 2s window and each row's success label has to
  // expire on its own clock.
  const resetTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  useEffect(() => {
    const timers = resetTimersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  const fetchLadderData = useCallback(async (): Promise<void> => {
    const [rosterData, nivelesData] = await Promise.all([
      fetchAlumnosConNivel(),
      fetchNivelesConOcupacion(),
    ]);
    setRoster(rosterData);
    setNiveles(nivelesData);
  }, []);

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      await fetchLadderData();
    } catch {
      setLoadError("No se pudieron cargar los niveles. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [fetchLadderData]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const students = useMemo(() => buildNivelStudentsFromAlumnos(roster), [roster]);
  const assignedCount = students.filter((student) => student.nivelRankingId !== null).length;

  /** Rank order — the ladder's order, and the order every level picker uses. */
  const nivelesPorPuesto = useMemo(
    () => [...niveles].sort((a, b) => a.numeroNivel - b.numeroNivel),
    [niveles],
  );

  const sinNivel = useMemo(() => unassignedStudents(students), [students]);
  const resultados = useMemo(
    () => searchStudents(students, studentSearch),
    [students, studentSearch],
  );
  const buscando = studentSearch.trim() !== "";
  const resaltados = useMemo(
    () => new Set(resultados.map((student) => student.id)),
    [resultados],
  );

  const rungs: LadderRung[] = useMemo(
    () =>
      niveles.map((nivel) => ({
        id: nivel.id,
        numeroNivel: nivel.numeroNivel,
        nombre: nivelNombre(nivel),
        // ONE source for every number on this screen: the rung's headcount is
        // the length of the roster the panel lists by name, so the count and
        // the names cannot disagree. `personasActuales` is never read.
        students: studentsOnNivel(students, nivel.id).map((student) => ({
          id: student.id,
          nombre: studentFullName(student),
        })),
      })),
    [niveles, students],
  );

  const openNivel = niveles.find((nivel) => nivel.id === openNivelId) ?? null;

  function handleToggleRung(nivelId: number): void {
    setAssignError(null);
    setPanelSearch("");
    setOpenNivelId((prev) => (prev === nivelId ? null : nivelId));
  }

  /**
   * Assign or move — one gesture for the user, two endpoints underneath. A
   * student with no level yet takes `asignar-nivel-inicial`; anyone already
   * on a rung takes `mover-de-nivel`.
   */
  async function handleAssign(student: NivelStudentRef, nivelId: number): Promise<void> {
    setSavingId(student.id);
    setAssignError(null);

    const pending = resetTimersRef.current.get(student.id);
    if (pending) {
      clearTimeout(pending);
      resetTimersRef.current.delete(student.id);
    }

    try {
      if (student.nivelRankingId === null) {
        await assignStudentToNivel(Number(student.id), nivelId);
      } else {
        await moveStudentToNivel(Number(student.id), nivelId);
      }

      // Optimistic: the rung's roster updates without a refetch.
      setRoster((prev) =>
        prev.map((alumno) =>
          String(alumno.personaId) === student.id
            ? { ...alumno, nivelRankingId: nivelId }
            : alumno,
        ),
      );
      setSuccessIds((prev) => new Set(prev).add(student.id));
      setTargetNivelIds((prev) => {
        if (!(student.id in prev)) return prev;
        const next = { ...prev };
        delete next[student.id];
        return next;
      });
      showSuccess("Nivel asignado correctamente.");

      const timer = setTimeout(() => {
        setSuccessIds((prev) => {
          if (!prev.has(student.id)) return prev;
          const next = new Set(prev);
          next.delete(student.id);
          return next;
        });
        resetTimersRef.current.delete(student.id);
      }, SUCCESS_RESET_DELAY_MS);
      resetTimersRef.current.set(student.id, timer);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Error al asignar el nivel.";
      setAssignError(message);
      showError(message);
    } finally {
      setSavingId(null);
    }
  }

  /**
   * A search result that carries its own destination: the name, where they are
   * now, a level picker and the one button that places them.
   *
   * This is the row that answers "where is Juan, and move him" — including
   * moving a student who ALREADY holds a level, which the rung panel
   * deliberately does not offer (its left column is the unassigned only).
   */
  function renderStudentRow(student: NivelStudentRef): React.ReactElement {
    const nombre = studentFullName(student);
    const actual = niveles.find((nivel) => nivel.id === student.nivelRankingId) ?? null;
    const destino = targetNivelIds[student.id];
    const verbo = student.nivelRankingId === null ? "Asignar" : "Mover";
    const selectId = `nivel-destino-busqueda-${student.id}`;

    return (
      <li key={student.id} className="flex min-h-drow flex-wrap items-center gap-3 py-1.5">
        {/* On a phone the name takes the whole first line and the controls the
            second: truncating a student's name to "Arian…" to keep a picker on
            the same row loses the only thing the row is about. */}
        <span className="min-w-0 flex-1 basis-full truncate text-[13.5px] text-ink sm:basis-auto">
          {nombre}
        </span>

        {/* Where they are now — the half of "move Juan up" the admin has to
            know before picking a destination. */}
        <span className="flex-none text-[12.5px] text-ink-3">
          {actual ? `Nivel ${nivelNombre(actual)}` : "Sin nivel"}
        </span>

        <label htmlFor={selectId} className="sr-only">
          Nivel de destino para {nombre}
        </label>
        <select
          id={selectId}
          // `.input-field` carries `w-full`, which on a wide row would give the
          // picker everything and push the action onto a line of its own. A row
          // is "who · where they are · where they go · go", left to right.
          className="input-field h-ctl flex-1 sm:w-[168px] sm:flex-none"
          value={destino ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setTargetNivelIds((prev) => {
              const next = { ...prev };
              if (value === "") delete next[student.id];
              else next[student.id] = Number(value);
              return next;
            });
          }}
        >
          <option value="">Elegir nivel…</option>
          {nivelesPorPuesto
            .filter((nivel) => nivel.id !== student.nivelRankingId)
            .map((nivel) => (
              <option key={nivel.id} value={nivel.id}>
                {nivelNombre(nivel)}
              </option>
            ))}
        </select>

        <Button
          size="sm"
          className="flex-none"
          disabled={destino === undefined || savingId === student.id}
          onClick={() => {
            if (destino !== undefined) void handleAssign(student, destino);
          }}
          aria-label={`${verbo} a ${nombre}`}
        >
          {savingId === student.id
            ? "Guardando…"
            : successIds.has(student.id)
              ? "Listo"
              : verbo}
        </Button>
      </li>
    );
  }

  /** The overflow note a panel column shows when it is longer than it renders. */
  function renderHiddenNote(hiddenCount: number): React.ReactElement | null {
    if (hiddenCount <= 0) return null;
    return (
      <p className="mt-2 text-[12px] text-ink-3">
        {hiddenCount} estudiante{hiddenCount === 1 ? "" : "s"} más. Use la búsqueda para
        encontrarlos.
      </p>
    );
  }

  /**
   * The rung's own panel — TWO COLUMNS, and the geometry is the instruction.
   *
   * *"al desplegar se vean a la derecha los que están en el nivel y a la
   * izquierda los que no tienen asignado ningún nivel"*. Left is the students
   * with no level at all, each carrying the one button that places them; right
   * is the rung's roster. So the gesture the screen teaches is literal — you
   * move a name from the left column to the right one — and the arrow on the
   * button points the way it will travel.
   *
   * Below `md` the two columns stack in that same reading order: the
   * unassigned first (they are what you act on), the rung's roster under them.
   * Each column keeps its own heading, so a stacked panel still says which
   * list is which instead of running two rosters together.
   *
   * The left column is deliberately NOT "every student": moving someone who
   * already holds a level is a different question ("where is Juan, and move
   * him"), and the page-level finder above the ladder answers it with a
   * destination picker per result. Mixing both into one list is what produced
   * the old flat panel this replaced.
   */
  function renderPanel(): React.ReactElement | null {
    if (!openNivel) return null;
    const nombre = nivelNombre(openNivel);

    const sinNivelFiltrados = filterStudentsByName(sinNivel, panelSearch);
    const enElNivel = filterStudentsByName(
      studentsOnNivel(students, openNivel.id),
      panelSearch,
    );
    const sinNivelVisibles = sinNivelFiltrados.slice(0, PANEL_VISIBLE_LIMIT);
    const enElNivelVisibles = enElNivel.slice(0, PANEL_VISIBLE_LIMIT);

    return (
      <div className="border-t border-line bg-canvas px-5 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="flex-1 text-[13px] font-bold text-ink">
            Asignar estudiantes al nivel {nombre}
          </h3>
          <Button size="sm" onClick={() => setOpenNivelId(null)}>
            Cerrar
          </Button>
        </div>

        <SearchInput
          className="mb-3 max-w-xs"
          label={`Buscar estudiante para el nivel ${nombre}`}
          placeholder="Buscar por nombre…"
          value={panelSearch}
          onChange={setPanelSearch}
        />

        {assignError ? (
          <p className="mb-3 text-[12.5px] text-state-bad" role="alert">
            {assignError}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {/* LEFT — who has no level yet. The column you act from. */}
          <section aria-labelledby={`panel-sin-nivel-${openNivel.id}`}>
            <h4
              id={`panel-sin-nivel-${openNivel.id}`}
              className="mb-2 text-[12.5px] font-bold text-ink"
            >
              Sin nivel asignado ({sinNivelFiltrados.length})
            </h4>
            {sinNivelFiltrados.length === 0 ? (
              <p className="rounded-ctl border border-dashed border-line-2 px-4 py-3 text-[12.5px] text-ink-3">
                {sinNivel.length === 0
                  ? "Todos los estudiantes tienen un nivel."
                  : "Ningún estudiante sin nivel coincide con la búsqueda."}
              </p>
            ) : (
              <ul className="rounded-ctl border border-line bg-paper px-4 py-2">
                {sinNivelVisibles.map((student) => (
                  <li
                    key={student.id}
                    className="flex min-h-drow flex-wrap items-center gap-3 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                      {studentFullName(student)}
                    </span>
                    <Button
                      size="sm"
                      className="flex-none"
                      disabled={savingId === student.id}
                      onClick={() => void handleAssign(student, openNivel.id)}
                      aria-label={`Asignar ${studentFullName(student)} al nivel ${nombre}`}
                    >
                      {savingId === student.id ? (
                        "Guardando…"
                      ) : successIds.has(student.id) ? (
                        "Asignado"
                      ) : (
                        <>
                          Asignar
                          <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
                        </>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {renderHiddenNote(sinNivelFiltrados.length - sinNivelVisibles.length)}
          </section>

          {/* RIGHT — who already holds this level. */}
          <section aria-labelledby={`panel-en-nivel-${openNivel.id}`}>
            <h4
              id={`panel-en-nivel-${openNivel.id}`}
              className="mb-2 text-[12.5px] font-bold text-ink"
            >
              En el nivel {nombre} ({enElNivel.length})
            </h4>
            {enElNivel.length === 0 ? (
              <p className="rounded-ctl border border-dashed border-line-2 px-4 py-3 text-[12.5px] text-ink-3">
                {studentsOnNivel(students, openNivel.id).length === 0
                  ? "Todavía no hay estudiantes en este nivel."
                  : "Ningún estudiante de este nivel coincide con la búsqueda."}
              </p>
            ) : (
              <ul className="rounded-ctl border border-line bg-paper px-4 py-2">
                {enElNivelVisibles.map((student) => (
                  <li
                    key={student.id}
                    className="flex min-h-drow flex-wrap items-center gap-3 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                      {studentFullName(student)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {renderHiddenNote(enElNivel.length - enElNivelVisibles.length)}
          </section>
        </div>
      </div>
    );
  }

  const cima = nivelesPorPuesto[0];

  return (
    <AppShell eyebrow="Escalera de entrenamiento" title="Niveles">
      <BackLink href="/dashboard" label="Volver al Panel" />

      {loadError ? (
        <ErrorState className="mb-6" message={loadError} onRetry={() => void loadData()} />
      ) : null}

      {/* Two stats, and only two. The prototype caps this row at 520px so it
          reads as a pair rather than as a dashboard. */}
      <div className="mb-5 grid max-w-[520px] grid-cols-2 gap-3.5">
        {/*
            The gap is stated rather than left as a subtraction, but it is no
            longer a jump link: the students it counts are now listed inside
            EVERY rung's panel, in its left column, next to the rung that would
            receive them. There is no single block at the foot of the page to
            jump to anymore, and pointing at an arbitrary rung would be a guess.
        */}
        <StatCard
          label="Estudiantes asignados"
          value={assignedCount}
          hint={
            sinNivel.length > 0
              ? `de ${students.length} estudiantes · ${sinNivel.length} sin asignar`
              : `de ${students.length} estudiantes`
          }
        />
        <StatCard
          label="Niveles"
          value={niveles.length}
          hint={cima ? `${nivelNombre(cima)} es la cima` : "El primero es la cima"}
        />
      </div>

      {/* The person finder. The screen's real questions are about a student,
          not about a level, and neither could be asked before. */}
      <SearchInput
        className="mb-5 max-w-sm"
        label="Buscar un estudiante en toda la escalera"
        placeholder="Buscar estudiante por nombre…"
        value={studentSearch}
        onChange={setStudentSearch}
      />

      {/* Search results answer the question that was just typed, so they stay
          directly under the field that asked it. */}
      {buscando ? (
        <section className="mb-5 overflow-hidden rounded-card border border-line bg-paper">
          <h2 className="border-b border-line px-5 py-3 text-[13px] font-bold text-ink">
            Resultados de la búsqueda ({resultados.length})
          </h2>
          {resultados.length === 0 ? (
            <EmptyState
              icon={<Users size={21} strokeWidth={1.5} aria-hidden="true" />}
              title="Ningún estudiante coincide"
              description="Revise el nombre o borre la búsqueda para ver toda la escalera."
            />
          ) : (
            <ul className={STUDENT_ROW_GRID}>
              {resultados.map((student) => renderStudentRow(student))}
            </ul>
          )}
        </section>
      ) : null}

      {assignError && openNivel === null ? (
        <p className="mb-4 text-[12.5px] text-state-bad" role="alert">
          {assignError}
        </p>
      ) : null}

      {/* The ladder leads: it is what the screen is about, and the students on
          it are the ones already placed. */}
      <section className="mb-5 overflow-hidden rounded-card border border-line bg-paper">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          <Trophy size={16} strokeWidth={1.5} className="flex-none text-ink-2" aria-hidden="true" />
          <h2 className="flex-1 text-[13px] font-bold text-ink">
            La escalera ({assignedCount} asignado{assignedCount === 1 ? "" : "s"})
          </h2>
        </div>
        {loading ? (
          <LoadingState label="Cargando niveles…" />
        ) : niveles.length === 0 ? (
          <EmptyState
            icon={<Trophy size={21} strokeWidth={1.5} aria-hidden="true" />}
            title="Todavía no hay niveles"
            description="Cuando el club cree su primer nivel, la escalera aparecerá aquí."
          />
        ) : (
          <NivelLadder
            rungs={rungs}
            openNivelId={openNivelId}
            onAssign={handleToggleRung}
            renderPanel={renderPanel}
            highlightIds={resaltados}
          />
        )}
      </section>

    </AppShell>
  );
}
