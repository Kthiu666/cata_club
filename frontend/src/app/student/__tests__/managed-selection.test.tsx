/**
 * The guardian's dependent selection has to outlive a navigation.
 *
 * Laura picks Martín on `/student`, opens `/student/payments`, and the screen
 * used to snap back to Sofía — a different plan, a different amount, a
 * different history. Every family screen unmounts its own hook on navigation,
 * so the selection cannot live in that hook's `useState`; these tests pin the
 * selection to a store that survives the unmount and a reload of the tab.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useManagedProfiles } from "../ManagedStudentPicker";
import {
  MANAGED_SELECTION_STORAGE_KEY,
  resetManagedSelectionForTests,
} from "../managed-selection-store";
import type { StudentPortalSummary, StudentProfileSummary } from "@/services/api";

function profile(personaId: string, nombres: string): StudentProfileSummary {
  return { personaId, nombres, apellidos: "Vera" } as StudentProfileSummary;
}

const SOFIA = profile("p-sofia", "Sofía");
const MARTIN = profile("p-martin", "Martín");

function portal(representados: StudentProfileSummary[]): StudentPortalSummary {
  return { self: null, representados } as unknown as StudentPortalSummary;
}

beforeEach(() => {
  resetManagedSelectionForTests();
});

afterEach(() => {
  resetManagedSelectionForTests();
});

describe("useManagedProfiles", () => {
  it("selects the first managed profile when nothing has been chosen", () => {
    const { result } = renderHook(() => useManagedProfiles(portal([SOFIA, MARTIN]), false));

    expect(result.current.selectedId).toBe("p-sofia");
    expect(result.current.selectedProfile).toEqual(SOFIA);
  });

  it("keeps the chosen dependent after the screen that chose it unmounts", () => {
    const first = renderHook(() => useManagedProfiles(portal([SOFIA, MARTIN]), false));

    act(() => {
      first.result.current.setSelectedId("p-martin");
    });
    expect(first.result.current.selectedId).toBe("p-martin");

    // Navigation: the picking screen goes away, the next screen mounts fresh.
    first.unmount();
    const next = renderHook(() => useManagedProfiles(portal([SOFIA, MARTIN]), false));

    expect(next.result.current.selectedId).toBe("p-martin");
    expect(next.result.current.selectedProfile).toEqual(MARTIN);
  });

  it("propagates a change to every screen mounted at the same time", () => {
    const account = renderHook(() => useManagedProfiles(portal([SOFIA, MARTIN]), false));
    const payments = renderHook(() => useManagedProfiles(portal([SOFIA, MARTIN]), false));

    act(() => {
      account.result.current.setSelectedId("p-martin");
    });

    expect(payments.result.current.selectedId).toBe("p-martin");
  });

  it("restores the selection written by a previous page load of the same tab", () => {
    window.sessionStorage.setItem(MANAGED_SELECTION_STORAGE_KEY, "p-martin");

    const { result } = renderHook(() => useManagedProfiles(portal([SOFIA, MARTIN]), false));

    expect(result.current.selectedId).toBe("p-martin");
  });

  it("falls back to the first profile when the stored id is not managed anymore", () => {
    window.sessionStorage.setItem(MANAGED_SELECTION_STORAGE_KEY, "p-someone-else");

    const { result } = renderHook(() => useManagedProfiles(portal([SOFIA, MARTIN]), false));

    expect(result.current.selectedId).toBe("p-sofia");
  });

  it("puts the account's own profile first when it has an ALUMNO role", () => {
    const self = profile("p-laura", "Laura");
    const data = { self, representados: [SOFIA, MARTIN] } as unknown as StudentPortalSummary;

    const { result } = renderHook(() => useManagedProfiles(data, true));

    expect(result.current.managedProfiles.map((p) => p.personaId)).toEqual([
      "p-laura",
      "p-sofia",
      "p-martin",
    ]);
    expect(result.current.selectedId).toBe("p-laura");
  });

  it("reports no profile when the account manages nobody", () => {
    const { result } = renderHook(() => useManagedProfiles(portal([]), false));

    expect(result.current.selectedId).toBe("");
    expect(result.current.selectedProfile).toBeNull();
  });
});
