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
  getNextId,
} from "../mockStore";
import type { Product } from "../api";

/** A factory that produces a valid product without needing to import fixtures. */
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: getNextId(),
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

describe("mockStore", () => {
  describe("getProducts", () => {
    it("returns the full list of seeded products", () => {
      const products = getProducts();
      expect(products.length).toBeGreaterThanOrEqual(5);
      // First seeded product is "Laptop Gamer X1"
      expect(products[0].name).toBe("Laptop Gamer X1");
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

  describe("getNextId", () => {
    it("returns incrementing string ids", () => {
      const first = Number.parseInt(getNextId(), 10);
      const second = Number.parseInt(getNextId(), 10);
      expect(second).toBe(first + 1);
    });
  });
});
