/**
 * Route Handler Tests — GET/PUT/DELETE /api/products/[id]
 *
 * Verifies individual product CRUD operations: fetching by id, updating,
 * deleting, and all error paths (404, invalid body).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, PUT, DELETE } from "../[id]/route";
import {
  resetMockStore,
  getProductById,
  getProducts,
} from "@/services/mockStore";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetMockStore();
});

function makePutRequest(body: unknown): Request {
  return new Request("http://localhost/api/products/1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): Request {
  return new Request("http://localhost/api/products/1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "{bad json",
  });
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe("GET /api/products/[id]", () => {
  it("returns 200 with the product for a known id", async () => {
    const response = await GET(
      new Request("http://localhost/api/products/1"),
      { params: { id: "1" } },
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.id).toBe("1");
    expect(body.name).toBe("Laptop Gamer X1");
  });

  it("returns 404 for an unknown id", async () => {
    const response = await GET(
      new Request("http://localhost/api/products/unknown"),
      { params: { id: "non-existent" } },
    );

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty("message");
    expect(body.message).toContain("not found");
  });
});

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

describe("PUT /api/products/[id]", () => {
  it("returns 200 with the updated product", async () => {
    const response = await PUT(
      makePutRequest({ name: "Updated Laptop", price: 999.99 }),
      { params: { id: "1" } },
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.id).toBe("1");
    expect(body.name).toBe("Updated Laptop");
    expect(body.price).toBe(999.99);
  });

  it("persists updates in the mock store", async () => {
    await PUT(makePutRequest({ stock: 42 }), { params: { id: "2" } });

    const updated = getProductById("2");
    expect(updated!.stock).toBe(42);
  });

  it("partial update preserves other fields", async () => {
    await PUT(makePutRequest({ price: 199.99 }), { params: { id: "1" } });

    const updated = getProductById("1");
    expect(updated!.price).toBe(199.99);
    // unchanged fields should still be the same
    expect(updated!.name).toBe("Laptop Gamer X1");
    expect(updated!.stock).toBe(15);
  });

  it("updates updatedAt timestamp on every update", async () => {
    const before = getProductById("1")!.updatedAt;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    try {
      await PUT(makePutRequest({ name: "Renamed" }), { params: { id: "1" } });
    } finally {
      vi.useRealTimers();
    }

    const after = getProductById("1")!.updatedAt;
    expect(after).not.toBe(before);
    expect(after).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns 404 for an unknown id", async () => {
    const response = await PUT(makePutRequest({ name: "Ghost" }), {
      params: { id: "non-existent" },
    });

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.message).toContain("not found");
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await PUT(makeInvalidJsonRequest(), {
      params: { id: "1" },
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty("message");
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

describe("DELETE /api/products/[id]", () => {
  it("returns 200 with a success message", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/products/1", { method: "DELETE" }),
      { params: { id: "1" } },
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("message");
    expect(body.message).toContain("deleted");
  });

  it("removes the product from the mock store", async () => {
    await DELETE(
      new Request("http://localhost/api/products/1", { method: "DELETE" }),
      { params: { id: "1" } },
    );

    const product = getProductById("1");
    expect(product).toBeUndefined();
  });

  it("only removes the targeted product", async () => {
    const allBefore = getProducts().length;

    await DELETE(
      new Request("http://localhost/api/products/3", { method: "DELETE" }),
      { params: { id: "3" } },
    );

    expect(getProducts()).toHaveLength(allBefore - 1);
    expect(getProductById("1")).toBeDefined(); // other products remain
    expect(getProductById("2")).toBeDefined();
  });

  it("returns 404 for an unknown id", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/products/unknown", {
        method: "DELETE",
      }),
      { params: { id: "non-existent" } },
    );

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.message).toContain("not found");
  });
});
