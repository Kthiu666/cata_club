// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { clearLegacyEnrollmentSession } from "../enrollment-session";

describe("clearLegacyEnrollmentSession", () => {
  it("removes the legacy client-side enrollment token record", () => {
    localStorage.setItem("cata-club-enrollment-session", '{"accessToken":"unsafe"}');

    clearLegacyEnrollmentSession();

    expect(localStorage.getItem("cata-club-enrollment-session")).toBeNull();
  });
});
