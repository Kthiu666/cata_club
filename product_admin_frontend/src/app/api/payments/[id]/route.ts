/**
 * Mock Route Handler — PUT /api/payments/[id]
 *
 * Approve or reject a membership payment validation request (CU012).
 *
 * Request body (approve):
 *   { "action": "approved" }
 *
 * Request body (reject):
 *   { "action": "rejected", "rejectionReason": "string" }
 */

import { NextResponse } from "next/server";
import {
  getPaymentValidationById,
  updatePaymentValidation,
  validatePaymentValidationTransition,
} from "@/services/mockStore";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const existing = getPaymentValidationById(params.id);

  if (!existing) {
    return NextResponse.json(
      { message: "Payment validation request not found" },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const now = new Date().toISOString();

    // --- Domain guard: only pending requests may transition ---
    if (body.action === "approved" || body.action === "rejected") {
      const verdict = validatePaymentValidationTransition(existing, body.action);
      if (!verdict.valid) {
        return NextResponse.json(
          { message: verdict.message },
          { status: 409 },
        );
      }
    }

    if (body.action === "approved") {
      const updated = updatePaymentValidation(params.id, {
        validationStatus: "approved",
        currentMembershipStatus: "active",
        validatedAt: now,
        validatedBy: "admin@cataclub.com",
        rejectionReason: undefined,
      });
      return NextResponse.json(updated);
    }

    if (body.action === "rejected") {
      if (
        !body.rejectionReason ||
        typeof body.rejectionReason !== "string" ||
        body.rejectionReason.trim().length === 0
      ) {
        return NextResponse.json(
          { message: "Rejection reason is required and must not be empty" },
          { status: 400 },
        );
      }

      const updated = updatePaymentValidation(params.id, {
        validationStatus: "rejected",
        currentMembershipStatus: "pending_payment",
        validatedAt: now,
        validatedBy: "admin@cataclub.com",
        rejectionReason: body.rejectionReason.trim(),
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { message: "Invalid action. Use 'approved' or 'rejected'." },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
}
