/**
 * Smoke tests for the in-memory mock store.
 *
 * These tests verify that the mock store behaves like a minimal data layer
 * without needing a real backend.
 * They are NOT a substitute for the real backend's integration tests.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  resetMockStore,
  getPaymentValidations,
  getPaymentValidationById,
  updatePaymentValidation,
  validatePaymentValidationTransition,
} from "../mockStore";
import type { PaymentValidationRequest } from "../api";

// ---------------------------------------------------------------------------
// Global isolation: every test starts from a clean mock store.
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetMockStore();
});

/** A factory for payment validation request fixtures. */
function makePaymentValidation(
  overrides: Partial<PaymentValidationRequest> = {},
): PaymentValidationRequest {
  return {
    id: "pv-test-1",
    studentName: "Test Student",
    responsablePagoName: "Test Responsible",
    membershipPeriod: "July 2026",
    membershipType: "Monthly",
    expectedAmount: 85.0,
    paymentMethod: "Bank Transfer",
    uploadedAt: new Date().toISOString(),
    currentMembershipStatus: "vencida",
    proofFileName: "test-proof.pdf",
    proofFileType: "pdf",
    validationStatus: "pendiente",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Payment Validation Mock Store Tests
// ---------------------------------------------------------------------------

describe("payment validation mockStore", () => {
  describe("getPaymentValidations", () => {
    it("returns the full list of seeded payment validation requests", () => {
      const requests = getPaymentValidations();
      expect(requests.length).toBeGreaterThanOrEqual(6);
      // Identify by id, not by index — tests must not rely on ordering
      expect(requests.find((r) => r.id === "pv-001")?.studentName).toBe("Sofia Martinez");
    });

    it("includes requests with different validation statuses", () => {
      const requests = getPaymentValidations();
      const statuses = requests.map((r) => r.validationStatus);
      expect(statuses).toContain("pendiente");
      expect(statuses).toContain("validado");
      expect(statuses).toContain("rechazado");
    });
  });

  describe("getPaymentValidationById", () => {
    it("returns a request by its id", () => {
      const request = getPaymentValidationById("pv-001");
      expect(request).toBeDefined();
      expect(request!.studentName).toBe("Sofia Martinez");
    });

    it("returns undefined for a non-existent id", () => {
      expect(getPaymentValidationById("non-existent")).toBeUndefined();
    });
  });

  describe("updatePaymentValidation", () => {
    it("updates validation status and membership status on approval", () => {
      const now = new Date().toISOString();
      const updated = updatePaymentValidation("pv-001", {
        validationStatus: "validado",
        currentMembershipStatus: "activa",
        validatedAt: now,
        validatedBy: "admin@test.com",
      });

      expect(updated).toBeDefined();
      expect(updated!.validationStatus).toBe("validado");
      expect(updated!.currentMembershipStatus).toBe("activa");
      expect(updated!.validatedBy).toBe("admin@test.com");
    });

    it("updates on rejection with rejectionReason", () => {
      const now = new Date().toISOString();
      const updated = updatePaymentValidation("pv-002", {
        validationStatus: "rechazado",
        currentMembershipStatus: "vencida",
        validatedAt: now,
        validatedBy: "admin@test.com",
        rejectionReason: "Amount does not match",
      });

      expect(updated).toBeDefined();
      expect(updated!.validationStatus).toBe("rechazado");
      expect(updated!.currentMembershipStatus).toBe("vencida");
      expect(updated!.rejectionReason).toBe("Amount does not match");
    });

    it("returns undefined for a non-existent id", () => {
      expect(
        updatePaymentValidation("non-existent", { validationStatus: "validado" }),
      ).toBeUndefined();
    });

    it("preserves unrelated fields when updating", () => {
      const original = getPaymentValidationById("pv-003");
      expect(original).toBeDefined();

      updatePaymentValidation("pv-003", {
        validatedBy: "new-admin@test.com",
      });

      const updated = getPaymentValidationById("pv-003");
      expect(updated!.studentName).toBe(original!.studentName);
      expect(updated!.expectedAmount).toBe(original!.expectedAmount);
      expect(updated!.validatedBy).toBe("new-admin@test.com");
    });

    it("contains seeded request with responsablePagoName and deprecated representativeName", () => {
      const request = getPaymentValidationById("pv-001");
      // Primary field — responsablePagoName is the canonical field
      expect(request!.responsablePagoName).toBe("Carlos Martinez");
      // Backward compatibility — deprecated but still populated
      expect(request!.representativeName).toBe("Carlos Martinez");
    });

    it("contains seeded request with rejectionReason", () => {
      const request = getPaymentValidationById("pv-004");
      expect(request!.validationStatus).toBe("rechazado");
      expect(request!.rejectionReason).toBeDefined();
      expect(request!.rejectionReason!.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Determinism — resetMockStore
// ---------------------------------------------------------------------------

describe("resetMockStore", () => {
  it("restores payments to the initial set after mutations", () => {
    updatePaymentValidation("pv-001", { validationStatus: "validado" });
    resetMockStore();

    const restored = getPaymentValidationById("pv-001");
    expect(restored!.validationStatus).toBe("pendiente");
    expect(restored!.validatedBy).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Domain guard — validatePaymentValidationTransition
// ---------------------------------------------------------------------------

describe("validatePaymentValidationTransition", () => {
  it("allows approve on a pending request", () => {
    const result = validatePaymentValidationTransition(
      { id: "pv-001", validationStatus: "pendiente" },
      "approved",
    );
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it("allows reject on a pending request", () => {
    const result = validatePaymentValidationTransition(
      { id: "pv-001", validationStatus: "pendiente" },
      "rejected",
    );
    expect(result.valid).toBe(true);
  });

  it("rejects approve on an already approved request", () => {
    const result = validatePaymentValidationTransition(
      { id: "pv-003", validationStatus: "validado" },
      "approved",
    );
    expect(result.valid).toBe(false);
    expect(result.message).toContain("validado");
    expect(result.message).toContain("pv-003");
  });

  it("rejects approve on an already rejected request", () => {
    const result = validatePaymentValidationTransition(
      { id: "pv-004", validationStatus: "rechazado" },
      "approved",
    );
    expect(result.valid).toBe(false);
    expect(result.message).toContain("approved");
    expect(result.message).toContain("rechazado");
  });

  it("rejects reject on an already resolved request", () => {
    const result = validatePaymentValidationTransition(
      { id: "pv-003", validationStatus: "validado" },
      "rejected",
    );
    expect(result.valid).toBe(false);
    expect(result.message).toContain("rejected");
    expect(result.message).toContain("validado");
  });

  it("returns a clear error message with the request id", () => {
    const result = validatePaymentValidationTransition(
      { id: "pv-099", validationStatus: "validado" },
      "approved",
    );
    expect(result.valid).toBe(false);
    expect(result.message).toContain("pv-099");
  });
});
