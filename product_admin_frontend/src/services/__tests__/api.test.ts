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
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../api";
import type { Product } from "../api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal product-shaped response body. */
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Widget",
    description: "A widget",
    price: 9.99,
    stock: 10,
    category: "Gadgets",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

/** Factory for a successful fetch Response. */
function okResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
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
// fetchProducts – happy path
// ---------------------------------------------------------------------------

describe("fetchProducts", () => {
  it("calls /api/products when NEXT_PUBLIC_USE_MOCKS=true", async () => {
    const products = [makeProduct({ id: "1" }), makeProduct({ id: "2" })];
    vi.mocked(global.fetch).mockResolvedValue(okResponse(products));

    const result = await fetchProducts();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    // With NEXT_PUBLIC_USE_MOCKS=true, getBaseUrl() returns "" so the
    // full URL is just "/api/products".
    expect(global.fetch).toHaveBeenCalledWith("/api/products", expect.anything());
    expect(result).toEqual(products);
  });

  it("calls the real backend URL when USE_MOCKS is off", async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = "false";
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/v1";

    vi.mocked(global.fetch).mockResolvedValue(okResponse([]));

    await fetchProducts();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/products",
      expect.anything(),
    );
  });

  it("defaults API_URL to localhost:8000 when USE_MOCKS is off and no URL is set", async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = "false";
    vi.mocked(global.fetch).mockResolvedValue(okResponse([]));

    await fetchProducts();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/products",
      expect.anything(),
    );
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

    await expect(fetchProducts()).rejects.toThrow("Internal server error");
  });

  it("throws a useful error message for a 404 response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(404, { message: "Not found" }),
    );

    await expect(fetchProducts()).rejects.toThrow("Not found");
  });

  it("falls back to a status-based message when no JSON body is returned", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    await expect(fetchProducts()).rejects.toThrow(
      "Request failed with status 500",
    );
  });

  it("includes the HTTP status on the thrown error", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(422, { message: "Validation failed" }),
    );

    try {
      await fetchProducts();
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

    await fetchProductById("42");

    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const headers = options!.headers as Record<string, string>;

    expect(headers["content-type"]).toBe("application/json");
  });

  it("merges caller-provided headers without dropping Content-Type", async () => {
    vi.mocked(global.fetch).mockResolvedValue(okResponse([]));

    await createProduct({
      name: "New",
      description: "Test",
      price: 1,
      stock: 1,
      category: "Test",
    });

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
      // Never settle — timeout should abort the signal regardless
      return new Promise(() => {});
    });

    // Start the request (won't settle — the mock never resolves)
    fetchProducts();

    // Advance past the 10 s threshold — timer fires and calls controller.abort()
    await vi.advanceTimersByTimeAsync(10_001);

    // The signal should have been aborted by the timeout
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal!.aborted).toBe(true);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Other public methods – basic smoke tests
// ---------------------------------------------------------------------------

describe("other API methods", () => {
  it("fetchProductById calls /api/products/:id", async () => {
    const product = makeProduct({ id: "99" });
    vi.mocked(global.fetch).mockResolvedValue(okResponse(product));

    const result = await fetchProductById("99");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/products/99",
      expect.anything(),
    );
    expect(result).toEqual(product);
  });

  it("createProduct sends POST with JSON body", async () => {
    const dto = { name: "New", description: "Desc", price: 10, stock: 5, category: "Cat" };
    vi.mocked(global.fetch).mockResolvedValue(okResponse(makeProduct()));

    await createProduct(dto);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/products",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(dto),
      }),
    );
  });

  it("updateProduct sends PUT with partial body", async () => {
    vi.mocked(global.fetch).mockResolvedValue(okResponse(makeProduct()));

    await updateProduct("1", { price: 20 });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/products/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ price: 20 }),
      }),
    );
  });

  it("deleteProduct sends DELETE and returns success message", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      okResponse({ message: "Deleted" }),
    );

    const result = await deleteProduct("1");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/products/1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(result).toEqual({ message: "Deleted" });
  });
});
