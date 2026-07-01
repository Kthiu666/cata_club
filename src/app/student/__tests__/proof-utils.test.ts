/**
 * Unit tests for the student proof-upload pure helpers.
 *
 * These tests verify the business logic for deriving proof status labels
 * and formatting file sizes — no React dependencies required.
 */

import { describe, it, expect } from "vitest";
import { getProofStatus, formatFileSize } from "../proof-utils";
import type { ProofStatus } from "../proof-utils";

// ---------------------------------------------------------------------------
// getProofStatus
// ---------------------------------------------------------------------------

describe("getProofStatus", () => {
  it('returns "not_uploaded" when no proof is uploaded', () => {
    expect(getProofStatus("activa", false, false)).toBe("not_uploaded");
    expect(getProofStatus("vencida", false, false)).toBe("not_uploaded");
    expect(getProofStatus("suspendida", false, false)).toBe("not_uploaded");
  });

  it('returns "pending_validation" when proof is uploaded but not validated', () => {
    expect(getProofStatus("activa", true, false)).toBe("pending_validation");
    expect(getProofStatus("vencida", true, false)).toBe("pending_validation");
    expect(getProofStatus("suspendida", true, false)).toBe("pending_validation");
  });

  it('returns "approved" when validated and membership is active', () => {
    expect(getProofStatus("activa", true, true)).toBe("approved");
  });

  it('returns "rejected" when validated but membership is not active (vencida)', () => {
    expect(getProofStatus("vencida", true, true)).toBe("rejected");
  });

  it('returns "rejected" when validated but membership is suspendida', () => {
    expect(getProofStatus("suspendida", true, true)).toBe("rejected");
  });

  it('returns "rejected" for any membership state with no proof and not validated', () => {
    expect(getProofStatus("activa", false, false)).toBe("not_uploaded");
    expect(getProofStatus("vencida", false, false)).toBe("not_uploaded");
    expect(getProofStatus("suspendida", false, false)).toBe("not_uploaded");
  });

  it("returns a valid ProofStatus for every membership status", () => {
    const statuses = ["activa", "vencida", "suspendida"] as const;
    const proofUploadedOptions = [true, false];
    const validatedOptions = [true, false];
    const validStatuses: ProofStatus[] = [
      "not_uploaded",
      "pending_validation",
      "approved",
      "rejected",
    ];

    for (const ms of statuses) {
      for (const pu of proofUploadedOptions) {
        for (const v of validatedOptions) {
          const result = getProofStatus(ms, pu, v);
          expect(validStatuses).toContain(result);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// formatFileSize
// ---------------------------------------------------------------------------

describe("formatFileSize", () => {
  it('returns "X B" for bytes', () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it('returns "X.X KB" for kilobytes', () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(1_048_575)).toBe("1024.0 KB");
  });

  it('returns "X.X MB" for megabytes', () => {
    expect(formatFileSize(1_048_576)).toBe("1.0 MB");
    expect(formatFileSize(2_621_440)).toBe("2.5 MB");
    expect(formatFileSize(5_242_880)).toBe("5.0 MB");
  });

  it("handles edge values correctly", () => {
    // Exactly 1 KB boundary
    expect(formatFileSize(1024)).toBe("1.0 KB");
    // Exactly 1 MB boundary
    expect(formatFileSize(1_048_576)).toBe("1.0 MB");
  });
});
