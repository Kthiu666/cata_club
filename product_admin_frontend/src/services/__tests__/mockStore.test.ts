/**
 * Smoke tests for the in-memory mock store.
 *
 * These tests verify that the mock store behaves like a minimal data layer
 * (CRUD operations, ID generation) without needing a real backend.
 * They are NOT a substitute for the real backend's integration tests.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  removeProduct,
  getNextProductId,
  resetMockStore,
  getPaymentValidations,
  getPaymentValidationById,
  updatePaymentValidation,
  validatePaymentValidationTransition,
} from "../mockStore";
import type { Product, PaymentValidationRequest } from "../api";

// ---------------------------------------------------------------------------
// Global isolation: every test starts from a clean mock store.
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetMockStore();
});

/** A factory that produces a valid product without needing to import fixtures. */
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: getNextProductId(),
    name: "Test Product",
    description: "A test product",
    price: 9.99,
    stock: 10,
    category: "Testing",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** A factory for payment validation request fixtures. */
function makePaymentValidation(
  overrides: Partial<PaymentValidationRequest> = {},
): PaymentValidationRequest {
  return {
    id: "pv-test-1",
    studentName: "Test Student",
    membershipPeriod: "July 2026",
    membershipType: "Monthly",
    expectedAmount: 85.0,
    paymentMethod: "Bank Transfer",
    uploadedAt: new Date().toISOString(),
    currentMembershipStatus: "pending_validation",
    proofFileName: "test-proof.pdf",
    proofFileType: "pdf",
    validationStatus: "pending",
    ...overrides,
  };
}

describe("product mockStore", () => {
  describe("getProducts", () => {
    it("returns the full list of seeded products", () => {
      const products = getProducts();
      expect(products.length).toBeGreaterThanOrEqual(5);
      // Identify by id, not by index — tests must not rely on ordering
      expect(products.find((p) => p.id === "1")?.name).toBe("Laptop Gamer X1");
    });
  });

  describe("getProductById", () => {
    it("returns a product by its id", () => {
      const product = getProductById("1");
      expect(product).toBeDefined();
      expect(product!.name).toBe("Laptop Gamer X1");
    });

    it("returns undefined for a non-existent id", () => {
      expect(getProductById("non-existent")).toBeUndefined();
    });
  });

  describe("addProduct", () => {
    it("adds a product and it appears in getProducts", () => {
      const before = getProducts().length;
      const newProduct = makeProduct({ name: "Added Product" });

      addProduct(newProduct);

      const after = getProducts().length;
      expect(after).toBe(before + 1);
      expect(getProductById(newProduct.id)?.name).toBe("Added Product");
    });
  });

  describe("updateProduct", () => {
    it("updates an existing product and returns it", () => {
      const updated = updateProduct("1", { price: 999.99 });
      expect(updated).toBeDefined();
      expect(updated!.price).toBe(999.99);
      expect(getProductById("1")!.price).toBe(999.99);
    });

    it("returns undefined for a non-existent id", () => {
      expect(updateProduct("non-existent", { price: 0 })).toBeUndefined();
    });
  });

  describe("removeProduct", () => {
    it("removes a product and returns true", () => {
      const product = makeProduct({ name: "To be removed" });
      addProduct(product);

      const result = removeProduct(product.id);
      expect(result).toBe(true);
      expect(getProductById(product.id)).toBeUndefined();
    });

    it("returns false for a non-existent id", () => {
      expect(removeProduct("non-existent")).toBe(false);
    });
  });

  describe("getNextProductId", () => {
    it("returns incrementing string ids", () => {
      const first = Number.parseInt(getNextProductId(), 10);
      const second = Number.parseInt(getNextProductId(), 10);
      expect(second).toBe(first + 1);
    });
  });
});

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
      expect(statuses).toContain("pending");
      expect(statuses).toContain("approved");
      expect(statuses).toContain("rejected");
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
        validationStatus: "approved",
        currentMembershipStatus: "active",
        validatedAt: now,
        validatedBy: "admin@test.com",
      });

      expect(updated).toBeDefined();
      expect(updated!.validationStatus).toBe("approved");
      expect(updated!.currentMembershipStatus).toBe("active");
      expect(updated!.validatedBy).toBe("admin@test.com");
    });

    it("updates on rejection with rejectionReason", () => {
      const now = new Date().toISOString();
      const updated = updatePaymentValidation("pv-002", {
        validationStatus: "rejected",
        currentMembershipStatus: "pending_payment",
        validatedAt: now,
        validatedBy: "admin@test.com",
        rejectionReason: "Amount does not match",
      });

      expect(updated).toBeDefined();
      expect(updated!.validationStatus).toBe("rejected");
      expect(updated!.currentMembershipStatus).toBe("pending_payment");
      expect(updated!.rejectionReason).toBe("Amount does not match");
    });

    it("returns undefined for a non-existent id", () => {
      expect(
        updatePaymentValidation("non-existent", { validationStatus: "approved" }),
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

    it("contains seeded request with representativeName", () => {
      const request = getPaymentValidationById("pv-001");
      expect(request!.representativeName).toBe("Carlos Martinez");
    });

    it("contains seeded request with rejectionReason", () => {
      const request = getPaymentValidationById("pv-004");
      expect(request!.validationStatus).toBe("rejected");
      expect(request!.rejectionReason).toBeDefined();
      expect(request!.rejectionReason!.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Determinism — resetMockStore
// ---------------------------------------------------------------------------

describe("resetMockStore", () => {
  it("restores products to the initial set after mutations", () => {
    addProduct(makeProduct({ id: "custom-1" }));
    removeProduct("1");
    expect(getProducts().length).toBeLessThan(6); // one removed, one added = still 5

    resetMockStore();

    const products = getProducts();
    expect(products.length).toBe(5);
    expect(products.find((p) => p.id === "1")).toBeDefined();
    expect(products.find((p) => p.id === "custom-1")).toBeUndefined();
  });

  it("restores payments to the initial set after mutations", () => {
    updatePaymentValidation("pv-001", { validationStatus: "approved" });
    resetMockStore();

    const restored = getPaymentValidationById("pv-001");
    expect(restored!.validationStatus).toBe("pending");
    expect(restored!.validatedBy).toBeUndefined();
  });

  it("resets the product ID counter", () => {
    // Drain a few IDs first
    getNextProductId();
    getNextProductId();
    resetMockStore();
    // After reset the counter should start from 6 again
    expect(getNextProductId()).toBe("6");
  });
});

// ---------------------------------------------------------------------------
// Domain guard — validatePaymentValidationTransition
// ---------------------------------------------------------------------------

describe("validatePaymentValidationTransition", () => {
  it("allows approve on a pending request", () => {
    const result = validatePaymentValidationTransition(
      { id: "pv-001", validationStatus: "pending" },
      "approved",
    );
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it("allows reject on a pending request", () => {
    const result = validatePaymentValidationTransition(
      { id: "pv-001", validationStatus: "pending" },
      "rejected",
    );
    expect(result.valid).toBe(true);
  });

  it("rejects approve on an already approved request", () => {
    const result = validatePaymentValidationTransition(
      { id: "pv-003", validationStatus: "approved" },
      "approved",
    );
    expect(result.valid).toBe(false);
    expect(result.message).toContain("approved");
    expect(result.message).toContain("pv-003");
  });

  it("rejects approve on an already rejected request", () => {
    const result = validatePaymentValidationTransition(
      { id: "pv-004", validationStatus: "rejected" },
      "approved",
    );
    expect(result.valid).toBe(false);
    expect(result.message).toContain("approved");
    expect(result.message).toContain("rejected");
  });

  it("rejects reject on an already resolved request", () => {
    const result = validatePaymentValidationTransition(
      { id: "pv-003", validationStatus: "approved" },
      "rejected",
    );
    expect(result.valid).toBe(false);
    expect(result.message).toContain("rejected");
    expect(result.message).toContain("approved");
  });

  it("returns a clear error message with the request id", () => {
    const result = validatePaymentValidationTransition(
      { id: "pv-099", validationStatus: "approved" },
      "approved",
    );
    expect(result.valid).toBe(false);
    expect(result.message).toContain("pv-099");
  });
});
