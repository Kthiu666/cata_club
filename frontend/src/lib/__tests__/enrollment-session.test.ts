// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { clearLegacyEnrollmentSession } from "../enrollment-session";

// jsdom in this environment doesn't ship a working `localStorage` (Node's
// experimental global shadows it — see AppShell.test.tsx's `createMemoryStorage`
// for the same workaround). Stub a real in-memory implementation so the test
// exercises the actual get/set contract instead of failing on a missing global.
function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => (key in store ? store[key] : null),
    setItem: (key: string, value: string): void => {
      store[key] = String(value);
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
    get length(): number {
      return Object.keys(store).length;
    },
  } as Storage;
}

describe("clearLegacyEnrollmentSession", () => {
  it("removes the legacy client-side enrollment token record", () => {
    vi.stubGlobal("localStorage", createMemoryStorage());

    localStorage.setItem("cata-club-enrollment-session", '{"accessToken":"unsafe"}');

    clearLegacyEnrollmentSession();

    expect(localStorage.getItem("cata-club-enrollment-session")).toBeNull();
  });
});
