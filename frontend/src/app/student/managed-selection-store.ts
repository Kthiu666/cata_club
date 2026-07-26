/**
 * Which dependent the family portal is currently about — one store, not one
 * `useState` per screen.
 *
 * ## Why this exists
 *
 * `useManagedProfiles` used to hold the selection in local state. That works
 * for exactly as long as the screen stays mounted, and a Next.js navigation
 * unmounts it: Laura picked Martín on `/student`, opened `/student/payments`,
 * and the portal silently answered a question about Sofía instead — her plan,
 * her amount, her history. It is the one defect in the portal with a money
 * consequence, and no amount of care inside a single page could fix it,
 * because the state died between pages.
 *
 * ## Why sessionStorage and not localStorage
 *
 * The selection is a "where am I right now" fact, not a preference. A tab that
 * reloads mid-flow should come back to the same child; a browser reopened
 * tomorrow, or a second tab opened deliberately to compare two children,
 * should start from the top of the list. `sessionStorage` is exactly that
 * scope. It is also per-tab, so two tabs never fight over one key.
 *
 * ## Why a module store and not context
 *
 * The three family screens are separate route segments with no common client
 * component to hold a provider — a provider would have to live in the root
 * layout and exist for every visitor, including the ones who never see a
 * dependent switcher. `useSyncExternalStore` keeps the reader-side API
 * identical while the state lives outside React, which is also what makes the
 * value survive the unmount.
 */

import { useSyncExternalStore } from "react";

/** Per-tab key holding the selected `personaId`. */
export const MANAGED_SELECTION_STORAGE_KEY = "cata:managed-persona";

let selectedId: string | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function readStoredId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(MANAGED_SELECTION_STORAGE_KEY);
  } catch {
    // Private-mode Safari and locked-down profiles throw on access. Losing the
    // selection is a smaller failure than crashing the portal.
    return null;
  }
}

function writeStoredId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MANAGED_SELECTION_STORAGE_KEY, id);
  } catch {
    // Same reasoning: the in-memory value still holds for this navigation.
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

/**
 * Read storage once, on the first snapshot, and serve the cached value after
 * that. Hydrating here rather than in `subscribe` means the very first render
 * already sees the stored dependent: hydrating on subscribe would change the
 * snapshot right after mount and cost every family screen an extra render
 * that visibly flips the switcher from the first child to the right one.
 */
function getSnapshot(): string | null {
  if (!hydrated) {
    hydrated = true;
    selectedId = readStoredId();
  }
  return selectedId;
}

/** The server cannot know the tab's selection; it renders the default. */
function getServerSnapshot(): string | null {
  return null;
}

/** The id the user last chose, or `null` when they have not chosen yet. */
export function useSelectedPersonaId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Record the chosen dependent for every screen, now and after navigation. */
export function setSelectedPersonaId(id: string): void {
  if (id === selectedId) return;
  selectedId = id;
  hydrated = true;
  writeStoredId(id);
  for (const listener of listeners) listener();
}

/**
 * Forget the selection entirely.
 *
 * Deliberately not wired into logout: an id from another account cannot
 * survive `useManagedProfiles`, which only honours ids the current account
 * actually manages, so clearing it would buy nothing and would make the auth
 * context import a route module.
 */
function clearSelectedPersonaId(): void {
  selectedId = null;
  hydrated = false;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(MANAGED_SELECTION_STORAGE_KEY);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  }
  for (const listener of listeners) listener();
}

/** Test seam: forget both the store and the tab's copy between cases. */
export function resetManagedSelectionForTests(): void {
  clearSelectedPersonaId();
  listeners.clear();
}
