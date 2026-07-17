const LEGACY_ENROLLMENT_SESSION_KEY = "cata-club-enrollment-session";

/** Remove tokens written by the previous client-side enrollment flow. */
export function clearLegacyEnrollmentSession(): void {
  try {
    localStorage.removeItem(LEGACY_ENROLLMENT_SESSION_KEY);
  } catch {
    // Storage can be unavailable without affecting enrollment.
  }
}
