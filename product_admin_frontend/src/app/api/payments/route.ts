/**
 * Mock Route Handler — GET /api/payments
 *
 * Returns membership payment validation requests for local development.
 * Used when NEXT_PUBLIC_USE_MOCKS=true.
 */

import { NextResponse } from "next/server";
import { getPaymentValidations } from "@/services/mockStore";

export async function GET() {
  return NextResponse.json(getPaymentValidations());
}
