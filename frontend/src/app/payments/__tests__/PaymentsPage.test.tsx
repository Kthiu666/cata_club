/**
 * Component tests for PaymentsPage — approve confirmation gating.
 * Covers: approve opens a confirmation before mutating; canceling leaves
 * status unchanged.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PaymentsPage from "@/app/payments/page";
import type { PaymentValidationRequest } from "@/services/api";

vi.mock("@/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockFetchPaymentValidations = vi.fn();
const mockUpdatePaymentValidation = vi.fn();

vi.mock("@/services/api", () => ({
  fetchPaymentValidations: () => mockFetchPaymentValidations(),
  updatePaymentValidation: (id: string, dto: unknown) =>
    mockUpdatePaymentValidation(id, dto),
}));

const PENDING_REQUEST: PaymentValidationRequest = {
  id: "req-1",
  studentName: "Juan Pérez",
  responsablePagoName: "María Pérez",
  membershipPeriod: "2026-Q1",
  membershipType: "Mensual",
  expectedAmount: 50,
  paymentMethod: "Transferencia",
  uploadedAt: "2026-07-01T10:00:00.000Z",
  currentMembershipStatus: "vencida",
  proofFileName: "comprobante.pdf",
  proofFileType: "pdf",
  validationStatus: "pendiente",
};

async function renderAndSelectPending(): Promise<void> {
  render(<PaymentsPage />);
  await waitFor(() => {
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
  });
  fireEvent.click(screen.getByText("Juan Pérez"));
  await screen.findByRole("button", { name: /aprobar pago/i });
}

describe("PaymentsPage — approve confirmation gating", () => {
  beforeEach(() => {
    mockFetchPaymentValidations.mockReset();
    mockUpdatePaymentValidation.mockReset();
    mockFetchPaymentValidations.mockResolvedValue([PENDING_REQUEST]);
    mockUpdatePaymentValidation.mockResolvedValue({
      ...PENDING_REQUEST,
      validationStatus: "validado",
    });
  });

  it("opens a confirmation dialog on 'Aprobar Pago' click without mutating yet", async () => {
    await renderAndSelectPending();

    fireEvent.click(screen.getByRole("button", { name: /aprobar pago/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mockUpdatePaymentValidation).not.toHaveBeenCalled();
  });

  it("mutates the payment status only after the confirm control is activated", async () => {
    await renderAndSelectPending();

    fireEvent.click(screen.getByRole("button", { name: /aprobar pago/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(mockUpdatePaymentValidation).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdatePaymentValidation).toHaveBeenCalledWith("req-1", {
      action: "approved",
    });
  });

  it("leaves the payment status unchanged when the confirmation is canceled", async () => {
    await renderAndSelectPending();

    fireEvent.click(screen.getByRole("button", { name: /aprobar pago/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancelar$/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockUpdatePaymentValidation).not.toHaveBeenCalled();
  });
});
