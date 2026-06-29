/**
 * In-Memory Mock Store
 *
 * Shared mutable store for local development mocks.
 * Data resets on server restart — never used in production.
 */

import type { Product } from "./api";

const initialProducts: Product[] = [
  {
    id: "1",
    name: "Laptop Gamer X1",
    description: "High-performance laptop with dedicated GPU and 16 GB RAM.",
    price: 1299.99,
    stock: 15,
    category: "Electrónica",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-15T14:30:00Z",
  },
  {
    id: "2",
    name: 'Monitor 27" 4K',
    description: "27-inch 4K UHD monitor with IPS panel.",
    price: 449.5,
    stock: 30,
    category: "Electrónica",
    createdAt: "2026-05-20T08:00:00Z",
    updatedAt: "2026-06-10T12:00:00Z",
  },
  {
    id: "3",
    name: "Teclado Mecánico RGB",
    description: "Mechanical keyboard with Cherry MX Blue switches.",
    price: 89.99,
    stock: 50,
    category: "Accesorios",
    createdAt: "2026-06-05T09:00:00Z",
    updatedAt: "2026-06-12T16:00:00Z",
  },
  {
    id: "4",
    name: "Mouse Inalámbrico",
    description: "Ergonomic wireless mouse with 6 programmable buttons.",
    price: 39.99,
    stock: 100,
    category: "Accesorios",
    createdAt: "2026-06-08T11:00:00Z",
    updatedAt: "2026-06-14T10:00:00Z",
  },
  {
    id: "5",
    name: "Webcam HD 1080p",
    description: "Full HD webcam with built-in microphone and auto-focus.",
    price: 59.99,
    stock: 25,
    category: "Accesorios",
    createdAt: "2026-06-10T13:00:00Z",
    updatedAt: "2026-06-10T13:00:00Z",
  },
];

let products: Product[] = [...initialProducts];
let nextId = 6;

export function getProducts(): Product[] {
  return products;
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function addProduct(product: Product): void {
  products.push(product);
}

export function updateProduct(id: string, updates: Partial<Product>): Product | undefined {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return undefined;

  products[index] = { ...products[index], ...updates, id };
  return products[index];
}

export function removeProduct(id: string): boolean {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return false;
  products.splice(index, 1);
  return true;
}

export function getNextId(): string {
  return String(nextId++);
}
