/**
 * Unit tests for the Membresías y Pagos page pagination helpers.
 *
 * Pure functions — no React dependencies. Pattern follows
 * members-utils.test.ts / attendance-utils.test.ts.
 */

import { describe, it, expect } from "vitest";
import type { PaymentValidationRequest } from "@/services/api";
import { PAYMENTS_PAGE_SIZE, paginatePaymentRequests, getTotalPages } from "../payments-utils";

function buildRequests(count: number): PaymentValidationRequest[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `req-${i}`,
    studentName: `Student ${i}`,
    membershipPeriod: "2026-07",
    membershipType: "Mensual",
    expectedAmount: 25,
    paymentMethod: "Transferencia",
    uploadedAt: "2026-07-01T12:00:00Z",
    currentMembershipStatus: "vencida",
    proofFileName: "comprobante.png",
    proofFileType: "image",
    validationStatus: "pendiente",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  }));
}

describe("paginatePaymentRequests", () => {
  it("uses a page size of 10", () => {
    expect(PAYMENTS_PAGE_SIZE).toBe(10);
  });

  it("slices requests to the page size for page 1, and the remainder for a later page", () => {
    const requests = buildRequests(25);
    const page1 = paginatePaymentRequests(requests, 1);
    expect(page1).toHaveLength(10);
    expect(page1[0].id).toBe("req-0");
    expect(page1[9].id).toBe("req-9");

    const page3 = paginatePaymentRequests(requests, 3);
    expect(page3).toHaveLength(5);
    expect(page3[0].id).toBe("req-20");
  });

  it("returns an empty array for a page beyond the data", () => {
    expect(paginatePaymentRequests(buildRequests(5), 5)).toEqual([]);
  });

  it("reflects a filtered subset, not the unfiltered total", () => {
    const requests = buildRequests(30);
    const filtered = requests.filter((r) => r.id === "req-0" || r.id === "req-1");
    expect(paginatePaymentRequests(filtered, 1)).toEqual(filtered);
    expect(getTotalPages(filtered.length)).toBe(1);
  });
});

describe("getTotalPages", () => {
  it("rounds up to a whole page count, floored at 1 (never 0 pages)", () => {
    expect(getTotalPages(25)).toBe(3);
    expect(getTotalPages(10)).toBe(1);
    expect(getTotalPages(0)).toBe(1);
  });
});
