/**
 * Mock Route Handler — GET /api/payments
 *
 * Returns membership payment validation requests for local development.
 * Used when NEXT_PUBLIC_USE_MOCKS=true.
 */

import { NextResponse } from "next/server";
import { getPaymentValidations } from "@/services/mockStore";

export async function GET(request: Request) {
  const mockRole = request.headers.get("x-mock-role");
  if (mockRole !== "admin") {
    return NextResponse.json(
      { message: "Solo administradores pueden ver pagos" },
      { status: 403 },
    );
  }

  return NextResponse.json(getPaymentValidations());
}
