/**
 * Pure utility functions for the Student proof-upload UI.
 *
 * Extracted from page.tsx for testability — no React dependencies.
 */

export type ProofStatus = "not_uploaded" | "pending_validation" | "approved" | "rejected";

/** Union of valid membership statuses — single source of truth. */
export type MembershipStatus =
  | "active"
  | "pending_validation"
  | "pending_payment"
  | "expired";

/**
 * Derives the proof status from membership + payment state.
 *
 * Business rules:
 *  - `pending_payment` with no proof uploaded → "not_uploaded"
 *  - Proof uploaded but not yet validated → "pending_validation"
 *  - Validated and membership active → "approved"
 *  - Everything else (expired, rejected proof, etc.) → "rejected"
 */
export function getProofStatus(
  membershipStatus: MembershipStatus,
  proofUploaded: boolean,
  validated: boolean,
): ProofStatus {
  if (membershipStatus === "pending_payment" && !proofUploaded) return "not_uploaded";
  if (proofUploaded && !validated) return "pending_validation";
  if (validated && membershipStatus === "active") return "approved";
  return "rejected";
}

/** Human-readable file size string (B / KB / MB). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
