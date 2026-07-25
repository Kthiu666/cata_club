/**
 * The guardian → dependent switcher, and the selection state behind it.
 *
 * Three family screens ask the same question — "whose account am I looking
 * at?" — and each used to answer it with its own copy of the select, its own
 * `useState`, and its own effect to re-anchor the selection when the profile
 * list changes. `/student` and `/student/payments` had already drifted apart
 * (different label, different control height, different focus ring), which is
 * the drift a third screen would have tripled.
 *
 * The hook is the load-bearing half: `managedProfiles` is derived on every
 * render, so anchoring the selection to it needs the id-list comparison below
 * rather than a reference check.
 */

"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { StudentPortalSummary, StudentProfileSummary } from "@/services/api";

export interface ManagedProfilesState {
  /** The account's own profile first (when it has one), then every dependent. */
  managedProfiles: StudentProfileSummary[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  /** The profile the screen is currently about, or `null` when the account manages nobody. */
  selectedProfile: StudentProfileSummary | null;
}

/**
 * Resolve which profiles this account manages and which one is selected.
 *
 * A representante with no ALUMNO role of their own is not in the list: they
 * have no student profile to show, and putting their name at the top of a
 * switcher that then renders an empty carnet is worse than leaving them out.
 */
export function useManagedProfiles(
  data: StudentPortalSummary,
  hasAlumnoRole: boolean,
): ManagedProfilesState {
  const managedProfiles: StudentProfileSummary[] =
    hasAlumnoRole && data.self ? [data.self, ...data.representados] : data.representados;

  const [selectedId, setSelectedId] = useState<string>(managedProfiles[0]?.personaId ?? "");

  const profileIds = managedProfiles.map((profile) => profile.personaId).join(",");

  useEffect(() => {
    if (!managedProfiles.some((profile) => profile.personaId === selectedId)) {
      setSelectedId(managedProfiles[0]?.personaId ?? "");
    }
    // Re-anchor only when the SET of managed ids changes — `managedProfiles`
    // is a fresh array on every render, so it cannot be the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileIds]);

  const selectedProfile =
    managedProfiles.find((profile) => profile.personaId === selectedId) ??
    managedProfiles[0] ??
    null;

  return { managedProfiles, selectedId, setSelectedId, selectedProfile };
}

export interface ManagedStudentPickerProps {
  id: string;
  profiles: StudentProfileSummary[];
  value: string;
  onChange: (personaId: string) => void;
}

/**
 * The switcher itself. Renders nothing for a single profile — a select with
 * one option is a control that cannot do anything.
 *
 * 40px (`h-ctl`) and a 10px radius (`rounded-ctl`) like every other control in
 * the system, with the `ball` focus ring `_sistema.css:80` specifies.
 */
export default function ManagedStudentPicker({
  id,
  profiles,
  value,
  onChange,
}: ManagedStudentPickerProps): React.ReactElement | null {
  if (profiles.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        htmlFor={id}
        className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-ink-3-strong"
      >
        Estudiante
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-ctl appearance-none rounded-ctl border border-line-2 bg-paper pl-3.5 pr-10 text-[13px] font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ball"
        >
          {profiles.map((profile) => (
            <option key={profile.personaId} value={profile.personaId}>
              {profile.nombres} {profile.apellidos}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
