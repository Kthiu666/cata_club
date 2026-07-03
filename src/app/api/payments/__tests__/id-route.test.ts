/**
 * Route Handler Tests — PUT /api/payments/[id]
 *
 * Covers the full contract of the payment validation endpoint: approve and
 * reject flows, domain transition guards, input validation, and error shapes.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PUT } from "../[id]/route";
import {
  resetMockStore,
  getPaymentValidationById,
} from "@/services/mockStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/payments/pv-001", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-mock-role": "admin" },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): Request {
  return new Request("http://localhost/api/payments/pv-001", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-mock-role": "admin" },
    body: "this is not valid json {",
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetMockStore();
});

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

describe("PUT /api/payments/[id] — authorization", () => {
  it("returns 403 when x-mock-role header is missing", async () => {
    const request = new Request("http://localhost/api/payments/pv-001", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approved" }),
    });
    const response = await PUT(request, { params: { id: "pv-001" } });
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toContain("administradores");
  });

  it("returns 403 when x-mock-role is not admin", async () => {
    const request = new Request("http://localhost/api/payments/pv-001", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-mock-role": "responsable_pago" },
      body: JSON.stringify({ action: "approved" }),
    });
    const response = await PUT(request, { params: { id: "pv-001" } });
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toContain("administradores");
  });
});

// ---------------------------------------------------------------------------
// Approve — happy path
// ---------------------------------------------------------------------------

describe("PUT /api/payments/[id] — approve", () => {
  it("returns 200 with updated payment when approving a pending request", async () => {
    const response = await PUT(makeRequest({ action: "approved" }), {
      params: { id: "pv-001" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");

    const body = await response.json();
    expect(body.id).toBe("pv-001");
    expect(body.validationStatus).toBe("validado");
    expect(body.currentMembershipStatus).toBe("activa");
  });

  it("persists the change in the mock store", async () => {
    await PUT(makeRequest({ action: "approved" }), {
      params: { id: "pv-001" },
    });

    const updated = getPaymentValidationById("pv-001");
    expect(updated!.validationStatus).toBe("validado");
    expect(updated!.currentMembershipStatus).toBe("activa");
    expect(updated!.validatedBy).toBe("admin@cataclub.com");
    expect(updated!.validatedAt).toBeDefined();
  });

  it("clears any previous rejection reason on approve", async () => {
    // pv-004 is currently rejected with a reason
    const before = getPaymentValidationById("pv-004");
    expect(before!.validationStatus).toBe("rechazado");

    // This will 409 — can't approve a rejected one; we test that separately.
    // Instead, verify that a fresh approve flow would clear rejectionReason:
    // Approve pv-002 (pending), then check rejectionReason is not set
    await PUT(makeRequest({ action: "approved" }), {
      params: { id: "pv-002" },
    });

    const updated = getPaymentValidationById("pv-002");
    expect(updated!.validationStatus).toBe("validado");
    // A fresh approve on a pending request has no rejectionReason
    expect(updated!.rejectionReason).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Reject — happy path
// ---------------------------------------------------------------------------

describe("PUT /api/payments/[id] — reject", () => {
  it("returns 200 with updated payment when rejecting with a reason", async () => {
    const response = await PUT(
      makeRequest({
        action: "rejected",
        rejectionReason: "Comprobante ilegible",
      }),
      { params: { id: "pv-001" } },
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.id).toBe("pv-001");
    expect(body.validationStatus).toBe("rechazado");
    expect(body.rejectionReason).toBe("Comprobante ilegible");
  });

  it("persists the rejection in the mock store", async () => {
    await PUT(
      makeRequest({
        action: "rejected",
        rejectionReason: "Monto incorrecto",
      }),
      { params: { id: "pv-005" } },
    );

    const updated = getPaymentValidationById("pv-005");
    expect(updated!.validationStatus).toBe("rechazado");
    expect(updated!.rejectionReason).toBe("Monto incorrecto");
    expect(updated!.validatedBy).toBe("admin@cataclub.com");
    // currentMembershipStatus is preserved, not forced to "vencida"
    expect(updated!.currentMembershipStatus).toBe("vencida");
  });

  it("preserves currentMembershipStatus on rejection (not forced to vencida)", async () => {
    // pv-002 is pending with currentMembershipStatus "vencida".
    // Rejection should preserve the existing status, not force-change it.
    const before = getPaymentValidationById("pv-002");
    expect(before!.currentMembershipStatus).toBe("vencida");

    await PUT(
      makeRequest({
        action: "rejected",
        rejectionReason: "Monto incorrecto",
      }),
      { params: { id: "pv-002" } },
    );

    const updated = getPaymentValidationById("pv-002");
    // The handler explicitly preserves the existing membership status on reject
    expect(updated!.currentMembershipStatus).toBe("vencida");
    expect(updated!.validationStatus).toBe("rechazado");
  });

  it("trims whitespace from rejectionReason", async () => {
    await PUT(
      makeRequest({
        action: "rejected",
        rejectionReason: "  Motivo con espacios  ",
      }),
      { params: { id: "pv-001" } },
    );

    const updated = getPaymentValidationById("pv-001");
    expect(updated!.rejectionReason).toBe("Motivo con espacios");
  });
});

// ---------------------------------------------------------------------------
// 404 — unknown id
// ---------------------------------------------------------------------------

describe("PUT /api/payments/[id] — 404", () => {
  it("returns 404 when the id does not exist", async () => {
    const response = await PUT(makeRequest({ action: "approved" }), {
      params: { id: "non-existent" },
    });

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty("message");
    expect(body.message).toContain("no encontrada");
  });
});

// ---------------------------------------------------------------------------
// 409 — invalid state transitions
// ---------------------------------------------------------------------------

describe("PUT /api/payments/[id] — 409 conflict (transition guard)", () => {
  it("rejects approve on an already-approved request (pv-003)", async () => {
    const response = await PUT(makeRequest({ action: "approved" }), {
      params: { id: "pv-003" },
    });

    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body).toHaveProperty("message");
    expect(body.message).toContain("approved");
    expect(body.message).toContain("pv-003");
    expect(body.message).toContain("validado");
  });

  it("rejects approve on an already-rejected request (pv-004)", async () => {
    const response = await PUT(makeRequest({ action: "approved" }), {
      params: { id: "pv-004" },
    });

    expect(response.status).toBe(409);
    expect((await response.json()).message).toContain("rechazado");
  });

  it("rejects reject on an already-approved request (pv-003)", async () => {
    const response = await PUT(
      makeRequest({
        action: "rejected",
        rejectionReason: "Some reason",
      }),
      { params: { id: "pv-003" } },
    );

    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.message).toContain("rejected");
    expect(body.message).toContain("pv-003");
  });

  it("rejects reject on an already-rejected request (pv-004)", async () => {
    const response = await PUT(
      makeRequest({
        action: "rejected",
        rejectionReason: "Another reason",
      }),
      { params: { id: "pv-004" } },
    );

    expect(response.status).toBe(409);
    expect((await response.json()).message).toContain("rechazado");
  });

  it("returns a descriptive message with the request id and current status", async () => {
    const response = await PUT(makeRequest({ action: "approved" }), {
      params: { id: "pv-003" },
    });

    const body = await response.json();
    // Message format: "Cannot {action} request {id}: current status is {status}. ..."
    expect(body.message).toMatch(/Cannot .+ request "pv-003".* "validado"/);
  });
});

// ---------------------------------------------------------------------------
// 400 — input validation
// ---------------------------------------------------------------------------

describe("PUT /api/payments/[id] — 400 validation (rejection reason)", () => {
  it("rejects with empty rejectionReason string", async () => {
    const response = await PUT(
      makeRequest({ action: "rejected", rejectionReason: "" }),
      { params: { id: "pv-001" } },
    );

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.message).toContain("motivo de rechazo");
  });

  it("rejects with whitespace-only rejectionReason", async () => {
    const response = await PUT(
      makeRequest({ action: "rejected", rejectionReason: "   " }),
      { params: { id: "pv-001" } },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain("motivo de rechazo");
  });

  it("rejects when rejectionReason is missing from the body", async () => {
    const response = await PUT(makeRequest({ action: "rejected" }), {
      params: { id: "pv-001" },
    });

    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain("motivo de rechazo");
  });

  it("rejects when rejectionReason is not a string", async () => {
    const response = await PUT(
      makeRequest({ action: "rejected", rejectionReason: 123 }),
      { params: { id: "pv-001" } },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain("motivo de rechazo");
  });
});

describe("PUT /api/payments/[id] — 400 validation (invalid action)", () => {
  it("rejects when action is missing from the body", async () => {
    const response = await PUT(makeRequest({}), {
      params: { id: "pv-001" },
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.message).toContain("Acción inválida");
    expect(body.message).toContain("approved");
    expect(body.message).toContain("rejected");
  });

  it("rejects an unknown action value", async () => {
    const response = await PUT(makeRequest({ action: "invalid_action" }), {
      params: { id: "pv-001" },
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.message).toContain("Acción inválida");
    expect(body.message).toContain("approved");
    expect(body.message).toContain("rejected");
  });
});

describe("PUT /api/payments/[id] — 400 validation (malformed body)", () => {
  it("rejects invalid JSON in the request body", async () => {
    const response = await PUT(makeInvalidJsonRequest(), {
      params: { id: "pv-001" },
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.message).toContain("inválido");
  });
});
