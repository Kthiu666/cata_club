/**
 * Route Handler Tests — GET /api/products, POST /api/products
 *
 * Verifies the mock products collection route returns correct JSON and
 * contract shapes for both list and create operations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "../route";
import {
  resetMockStore,
  getProducts,
  getProductById,
} from "@/services/mockStore";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetMockStore();
});

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): Request {
  return new Request("http://localhost/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not json {{{",
  });
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe("GET /api/products", () => {
  it("returns status 200 with Content-Type application/json", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("returns an array of products", async () => {
    const response = await GET();
    const body = await response.json();

    expect(Array.isArray(body)).toBe(true);
  });

  it("returns the seeded product set (5 records)", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveLength(5);
  });

  it("contains the expected seeded products identified by id", async () => {
    const response = await GET();
    const body = await response.json();

    const laptop = body.find((p: any) => p.id === "1");
    expect(laptop).toBeDefined();
    expect(laptop.name).toBe("Laptop Gamer X1");
    expect(laptop.price).toBe(1299.99);
  });

  it("every product has the required contract fields", async () => {
    const response = await GET();
    const body = await response.json();

    for (const p of body) {
      expect(p).toHaveProperty("id");
      expect(p).toHaveProperty("name");
      expect(p).toHaveProperty("description");
      expect(p).toHaveProperty("price");
      expect(p).toHaveProperty("stock");
      expect(p).toHaveProperty("category");
      expect(p).toHaveProperty("createdAt");
      expect(p).toHaveProperty("updatedAt");
    }
  });
});

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

describe("POST /api/products", () => {
  it("creates a new product and returns status 201", async () => {
    const response = await POST(
      makeRequest({
        name: "New Product",
        description: "A brand new product",
        price: 49.99,
        stock: 100,
        category: "Testing",
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("returns the created product with an auto-generated id", async () => {
    const response = await POST(
      makeRequest({
        name: "Tablet Pro",
        description: "A premium tablet",
        price: 599.0,
        stock: 20,
        category: "Electrónica",
      }),
    );

    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe("Tablet Pro");
    expect(body.price).toBe(599);
    expect(body.stock).toBe(20);
  });

  it("persists the new product in the mock store", async () => {
    await POST(
      makeRequest({
        name: "Persistent Product",
        price: 10,
        stock: 5,
        category: "Test",
      }),
    );

    const all = getProducts();
    const created = all.find((p) => p.name === "Persistent Product");
    expect(created).toBeDefined();
    expect(created!.price).toBe(10);
  });

  it("increments the product id counter", async () => {
    const response1 = await POST(
      makeRequest({ name: "A", price: 1, stock: 1, category: "X" }),
    );
    const body1 = await response1.json();

    const response2 = await POST(
      makeRequest({ name: "B", price: 2, stock: 2, category: "Y" }),
    );
    const body2 = await response2.json();

    expect(Number(body1.id)).toBeLessThan(Number(body2.id));
  });

  it("fills missing optional fields with defaults", async () => {
    const response = await POST(
      makeRequest({
        name: "Minimal Product",
        price: 15,
        stock: 3,
      }),
    );

    // category, description should have defaults
    const body = await response.json();
    expect(body.name).toBe("Minimal Product");
    expect(body.description).toBe("");
    expect(body.category).toBe("General");
  });

  it("coerces price and stock to numbers", async () => {
    const response = await POST(
      makeRequest({
        name: "Coerced",
        price: "99.99",
        stock: "10",
        category: "Test",
      }),
    );

    const body = await response.json();
    expect(body.price).toBe(99.99);
    expect(body.stock).toBe(10);
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await POST(makeInvalidJsonRequest());

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty("message");
  });

  it("adds timestamps (createdAt, updatedAt) to the new product", async () => {
    const response = await POST(
      makeRequest({
        name: "Timestamped",
        price: 25,
        stock: 1,
        category: "Test",
      }),
    );

    const body = await response.json();
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
    expect(body.createdAt).toEqual(body.updatedAt);
  });
});
