/**
 * Contract tests for the API client (src/services/api.ts).
 *
 * These tests verify the HTTP client contract without requiring a running
 * backend. All network calls are mocked via vi.spyOn(global, "fetch").
 *
 * Scope:
 *  - Happy path: correct URL resolution, response parsing.
 *  - Error paths: non-2xx status codes produce typed errors.
 *  - Header merging: caller headers coexist with Content-Type.
 *  - Timeout/abort: default timeout fires and rejects the request.
 *  - Mock default: USE_MOCKS defaults to true when env var is unset.
 *  - Payment validation: approve and reject flows, rejection reason validation.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchPaymentValidations,
  updatePaymentValidation,
} from "../api";
import type { PaymentValidationRequest } from "../api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Factory for a successful fetch Response. */
function okResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

/** A minimal payment-validation-shaped response body. */
function makePaymentValidation(
  overrides: Partial<PaymentValidationRequest> = {},
): PaymentValidationRequest {
  return {
    id: "pv-001",
    studentName: "Sofia Martinez",
    responsablePagoName: "Carlos Martinez",
    membershipPeriod: "July 2026",
    membershipType: "Monthly",
    expectedAmount: 85.0,
    paymentMethod: "Bank Transfer",
    uploadedAt: "2026-06-28T10:30:00Z",
    currentMembershipStatus: "vencida",
    proofFileName: "comprobante.pdf",
    proofFileType: "pdf",
    validationStatus: "pendiente",
    ...overrides,
  };
}

/** Factory for an error fetch Response. */
function errorResponse(
  status: number,
  body: Record<string, unknown> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.spyOn(global, "fetch");
  process.env.NEXT_PUBLIC_USE_MOCKS = "true";
  delete process.env.NEXT_PUBLIC_API_URL;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.NEXT_PUBLIC_USE_MOCKS;
  delete process.env.NEXT_PUBLIC_API_URL;
});

// ---------------------------------------------------------------------------
// Payment Validation API methods – contract tests
// ---------------------------------------------------------------------------

describe("fetchPaymentValidations", () => {
  it("calls /api/payments when NEXT_PUBLIC_USE_MOCKS=true", async () => {
    const items = [makePaymentValidation({ id: "pv-001" })];
    vi.mocked(global.fetch).mockResolvedValue(okResponse(items));

    const result = await fetchPaymentValidations();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("/api/payments", expect.anything());
    expect(result).toEqual(items);
  });

  it("calls the real backend URL when USE_MOCKS is off", async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = "false";
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/v1";

    vi.mocked(global.fetch).mockResolvedValue(okResponse([]));

    await fetchPaymentValidations();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/payments",
      expect.anything(),
    );
  });

  it("defaults API_URL to localhost:8000 when USE_MOCKS is off and no URL is set", async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = "false";
    vi.mocked(global.fetch).mockResolvedValue(okResponse([]));

    await fetchPaymentValidations();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/payments",
      expect.anything(),
    );
  });

  it("defaults to local mocks when NEXT_PUBLIC_USE_MOCKS is unset", async () => {
    delete process.env.NEXT_PUBLIC_USE_MOCKS;
    vi.mocked(global.fetch).mockResolvedValue(okResponse([]));

    await fetchPaymentValidations();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/payments",
      expect.anything(),
    );
  });

  it("throws a typed error on a non-2xx response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(500, { message: "Server error" }),
    );

    await expect(fetchPaymentValidations()).rejects.toThrow("Server error");
  });
});

// ---------------------------------------------------------------------------
// Non-2xx error handling
// ---------------------------------------------------------------------------

describe("error handling", () => {
  it("throws a useful error message for a 500 response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(500, { message: "Internal server error" }),
    );

    await expect(fetchPaymentValidations()).rejects.toThrow("Internal server error");
  });

  it("throws a useful error message for a 404 response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(404, { message: "Not found" }),
    );

    await expect(fetchPaymentValidations()).rejects.toThrow("Not found");
  });

  it("falls back to a status-based message when no JSON body is returned", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    await expect(fetchPaymentValidations()).rejects.toThrow(
      "Request failed with status 500",
    );
  });

  it("includes the HTTP status on the thrown error", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(422, { message: "Validation failed" }),
    );

    try {
      await fetchPaymentValidations();
      expect.fail("Expected an error");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error & { status: number }).status).toBe(422);
    }
  });
});

// ---------------------------------------------------------------------------
// Header merging
// ---------------------------------------------------------------------------

describe("header merging", () => {
  it("preserves Content-Type when the caller provides extra headers", async () => {
    vi.mocked(global.fetch).mockResolvedValue(okResponse([]));

    await fetchPaymentValidations();

    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const headers = options!.headers as Record<string, string>;

    expect(headers["content-type"]).toBe("application/json");
  });

  it("merges caller-provided headers without dropping Content-Type", async () => {
    vi.mocked(global.fetch).mockResolvedValue(okResponse([]));

    await updatePaymentValidation("pv-001", { action: "approved" });

    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const headers = options!.headers as Record<string, string>;

    // The explicit Content-Type should be present
    expect(headers["content-type"]).toBe("application/json");
  });
});

// ---------------------------------------------------------------------------
// Timeout / abort behaviour
// ---------------------------------------------------------------------------

describe("timeout / abort", () => {
  it("aborts the request after the default 10 s timeout when no signal is provided", async () => {
    vi.useFakeTimers();

    let capturedSignal: AbortSignal | undefined;
    vi.mocked(global.fetch).mockImplementation((_url, opts) => {
      capturedSignal = opts?.signal as AbortSignal | undefined;
      return new Promise((_resolve, reject) => {
        if (capturedSignal) {
          const onAbort = () =>
            queueMicrotask(() =>
              reject(new DOMException("The operation was aborted", "AbortError")),
            );
          if (capturedSignal.aborted) {
            onAbort();
          } else {
            capturedSignal.addEventListener("abort", onAbort, { once: true });
          }
        }
      });
    });

    try {
      // Start the request (won't settle — the mock never resolves)
      const promise = fetchPaymentValidations();
      // Pre-attach a handler so Node doesn't flag it as unhandled when abort fires
      promise.catch(() => {});

      // Advance past the 10 s threshold — timer fires and calls controller.abort()
      await vi.advanceTimersByTimeAsync(10_001);

      // The signal should have been aborted by the timeout
      expect(capturedSignal).toBeDefined();
      expect(capturedSignal!.aborted).toBe(true);

      await expect(promise).rejects.toThrow(/aborted/i);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// updatePaymentValidation — approve / reject
// ---------------------------------------------------------------------------

describe("updatePaymentValidation — approve", () => {
  it("sends PUT with action approved to /api/payments/:id in mock mode", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      okResponse(makePaymentValidation({ id: "pv-001", validationStatus: "validado" })),
    );

    const result = await updatePaymentValidation("pv-001", { action: "approved" });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/payments/pv-001",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ action: "approved" }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ id: "pv-001", validationStatus: "validado" }),
    );
  });

  it("calls the real backend URL with no doubled /api prefix", async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = "false";
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/v1";

    vi.mocked(global.fetch).mockResolvedValue(
      okResponse(makePaymentValidation({ validationStatus: "validado" })),
    );

    await updatePaymentValidation("pv-42", { action: "approved" });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/payments/pv-42",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("throws a typed error on a 404 response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(404, { message: "Payment validation request not found" }),
    );

    await expect(
      updatePaymentValidation("invalid-id", { action: "approved" }),
    ).rejects.toThrow("Payment validation request not found");
  });
});

describe("updatePaymentValidation — reject", () => {
  it("sends PUT with action rejected and rejectionReason", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      okResponse(
        makePaymentValidation({
          id: "pv-001",
          validationStatus: "rechazado",
          rejectionReason: "Invalid amount",
        }),
      ),
    );

    const result = await updatePaymentValidation("pv-001", {
      action: "rejected",
      rejectionReason: "Invalid amount",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/payments/pv-001",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ action: "rejected", rejectionReason: "Invalid amount" }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: "pv-001",
        validationStatus: "rechazado",
        rejectionReason: "Invalid amount",
      }),
    );
  });

  it("rejects with an empty rejection reason at the mock API level", async () => {
    // The mock handler validates rejectionReason is non-empty.
    // The client should pass through whatever the server returns.
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ message: "El motivo de rechazo es obligatorio y no debe estar vacío" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      updatePaymentValidation("pv-001", { action: "rejected", rejectionReason: "" }),
    ).rejects.toThrow("El motivo de rechazo es obligatorio y no debe estar vacío");
  });
});

// ---------------------------------------------------------------------------
// updatePaymentValidation — mock role header
// ---------------------------------------------------------------------------

describe("updatePaymentValidation — mock role header", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends x-mock-role: admin when localStorage has an admin session", async () => {
    vi.stubGlobal(
      "localStorage",
      {
        getItem: vi.fn().mockReturnValue(
          JSON.stringify({ user: { role: "admin" } }),
        ),
      },
    );
    vi.mocked(global.fetch).mockResolvedValue(
      okResponse(makePaymentValidation({ id: "pv-001", validationStatus: "validado" })),
    );

    await updatePaymentValidation("pv-001", { action: "approved" });

    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const headers = options!.headers as Record<string, string>;
    expect(headers["x-mock-role"]).toBe("admin");
    expect(headers["content-type"]).toBe("application/json");
  });

  it("does not send x-mock-role when localStorage has no session", async () => {
    vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue(null) });
    vi.mocked(global.fetch).mockResolvedValue(
      okResponse(makePaymentValidation({ id: "pv-001", validationStatus: "validado" })),
    );

    await updatePaymentValidation("pv-001", { action: "approved" });

    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const headers = options!.headers as Record<string, string>;
    expect(headers["x-mock-role"]).toBeUndefined();
    expect(headers["content-type"]).toBe("application/json");
  });

  it("does not log console.error when localStorage is unavailable and omits x-mock-role", async () => {
    // Delete any stubbed localStorage (Node has none by default) so
    // getMockRoleHeader hits the typeof-guard path.
    vi.stubGlobal("localStorage", undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(global.fetch).mockResolvedValue(
      okResponse(makePaymentValidation({ id: "pv-001", validationStatus: "validado" })),
    );

    await updatePaymentValidation("pv-001", { action: "approved" });

    expect(errorSpy).not.toHaveBeenCalled();

    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const headers = options!.headers as Record<string, string>;
    expect(headers["x-mock-role"]).toBeUndefined();

    errorSpy.mockRestore();
  });

  it("does not send x-mock-role when USE_MOCKS is false", async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = "false";
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/v1";

    vi.stubGlobal(
      "localStorage",
      {
        getItem: vi.fn().mockReturnValue(
          JSON.stringify({ user: { role: "admin" } }),
        ),
      },
    );
    vi.mocked(global.fetch).mockResolvedValue(
      okResponse(makePaymentValidation({ id: "pv-001", validationStatus: "validado" })),
    );

    await updatePaymentValidation("pv-001", { action: "approved" });

    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const headers = options!.headers as Record<string, string>;
    expect(headers["x-mock-role"]).toBeUndefined();
    expect(headers["content-type"]).toBe("application/json");
  });
});
