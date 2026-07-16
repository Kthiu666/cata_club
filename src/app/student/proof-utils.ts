/**
 * Pure utility functions for the Student proof-upload UI.
 *
 * Extracted from page.tsx for testability — no React dependencies.
 */

export type ProofStatus = "not_uploaded" | "pending_validation" | "validado" | "rechazado";

/**
 * Membership lifecycle status — aligns with `EstadoMembresia` in domain.ts.
 *
 * Membership is created/activated only after payment/comprobante is approved.
 * The old "pending_payment" / "pending_validation" membership states are no
 * longer valid — those are Pago states.
 */
export type MembershipStatus =
  | "activa"
  | "vencida"
  | "suspendida";

/**
 * Derives the proof status from membership + payment state.
 *
 * Business rules (domain model 2026-07):
 *  - No proof uploaded → "not_uploaded" (pending payment)
 *  - Proof uploaded but not yet validated → "pending_validation"
 *  - Proof validated AND membership active → "validado"
 *  - Everything else (expired membership, suspended, rejected proof) → "rechazado"
 */
export function getProofStatus(
  membershipStatus: MembershipStatus,
  proofUploaded: boolean,
  validated: boolean,
): ProofStatus {
  if (!proofUploaded) return "not_uploaded";
  if (proofUploaded && !validated) return "pending_validation";
  if (validated && membershipStatus === "activa") return "validado";
  return "rechazado";
}

/**
 * Tailwind text-color class for a given proof status.
 *
 * Reuses the same warning/success/error semantics as the shared
 * `.badge-*` classes (globals.css) so proof status text stays visually
 * consistent with badges elsewhere in the app.
 */
export function getProofStatusColorClass(status: ProofStatus): string {
  switch (status) {
    case "not_uploaded":
    case "pending_validation":
      return "text-amber-700";
    case "validado":
      return "text-cata-state-ok";
    case "rechazado":
      return "text-cata-red";
  }
}

/** Human-readable file size string (B / KB / MB). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
