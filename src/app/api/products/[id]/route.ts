/**
 * Mock Route Handler — GET/PUT/DELETE /api/products/[id]
 *
 * Individual product CRUD operations for local development.
 */

import { NextResponse } from "next/server";
import {
  getProductById,
  updateProduct as updateInStore,
  removeProduct,
} from "@/services/mockStore";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const product = getProductById(params.id);

  if (!product) {
    return NextResponse.json(
      { message: "Product not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(product);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const existing = getProductById(params.id);

  if (!existing) {
    return NextResponse.json(
      { message: "Product not found" },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const now = new Date().toISOString();

    const updated = updateInStore(params.id, {
      ...body,
      updatedAt: now,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const removed = removeProduct(params.id);

  if (!removed) {
    return NextResponse.json(
      { message: "Product not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ message: "Product deleted successfully" });
}
