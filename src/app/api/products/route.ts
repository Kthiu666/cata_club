/**
 * Mock Route Handler — GET /api/products, POST /api/products
 *
 * Returns realistic product data for local development.
 * Used when NEXT_PUBLIC_USE_MOCKS=true.
 *
 * Replace these stubs with real API calls once the Python backend is ready.
 */

import { NextResponse } from "next/server";
import type { Product } from "@/services/api";
import {
  getProducts,
  addProduct,
  getNextProductId,
} from "@/services/mockStore";

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json(getProducts());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();

    const newProduct: Product = {
      id: getNextProductId(),
      name: body.name || "Untitled Product",
      description: body.description || "",
      price: Number(body.price) || 0,
      stock: Number(body.stock) || 0,
      category: body.category || "General",
      imageUrl: body.imageUrl || undefined,
      createdAt: now,
      updatedAt: now,
    };

    addProduct(newProduct);
    return NextResponse.json(newProduct, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
}
