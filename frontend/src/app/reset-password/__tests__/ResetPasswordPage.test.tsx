/**
 * Component tests for ResetPasswordPage.
 *
 * Covers:
 *   - the server-error path, routed through `useToast().showError(...)`
 *     instead of an inline `.alert-error` box — see issue #51
 *   - the new success toast (`useToast().showSuccess("Contraseña actualizada
 *     correctamente")`) fired ALONGSIDE the existing persistent success card
 *     — both must coexist, neither replaces the other
 *   - `passwordError` (the inline live-validation message) stays untouched:
 *     still renders inline, still gates the submit button — explicitly out
 *     of scope for this migration
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetPasswordPage from "@/app/reset-password/page";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockToken: string | null = "valid-token";
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "token" ? mockToken : null),
  }),
}));

const mockShowError = vi.fn();
const mockShowSuccess = vi.fn();
vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({
    showToast: vi.fn(),
    showError: mockShowError,
    showSuccess: mockShowSuccess,
  }),
}));

const mockRestablecerContrasenia = vi.fn();
vi.mock("@/services/api", () => ({
  restablecerContrasenia: (token: string, nuevaContrasenia: string) =>
    mockRestablecerContrasenia(token, nuevaContrasenia),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fill the password + confirm-password fields with matching valid values. */
function fillMatchingPasswords(password = "password123"): void {
  fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Confirmar contraseña"), {
    target: { value: password },
  });
}

function submitResetForm(): void {
  fireEvent.click(
    screen.getByRole("button", { name: /restablecer contraseña/i }),
  );
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    mockToken = "valid-token";
    mockShowError.mockReset();
    mockShowSuccess.mockReset();
    mockRestablecerContrasenia.mockReset();
  });

  it("renders the form when a token is present", () => {
    render(<ResetPasswordPage />);

    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
    expect(screen.queryByText(/token no válido/i)).not.toBeInTheDocument();
  });

  describe("successful reset", () => {
    it("shows the success toast AND keeps the persistent success card", async () => {
      mockRestablecerContrasenia.mockResolvedValue(undefined);

      render(<ResetPasswordPage />);
      fillMatchingPasswords();
      submitResetForm();

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith(
          "Contraseña actualizada correctamente",
        );
      });
      expect(
        await screen.findByText(/contraseña actualizada/i),
      ).toBeInTheDocument();
      expect(mockShowError).not.toHaveBeenCalled();
    });
  });

  describe("failed submission", () => {
    it("shows the server error via toast.showError instead of an inline alert", async () => {
      mockRestablecerContrasenia.mockRejectedValue(
        new Error("El token ha expirado."),
      );

      render(<ResetPasswordPage />);
      fillMatchingPasswords();
      submitResetForm();

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith("El token ha expirado.");
      });
      expect(document.querySelector(".alert-error")).not.toBeInTheDocument();
      expect(mockShowSuccess).not.toHaveBeenCalled();
    });

    it("shows a fallback message via toast.showError for a non-Error rejection", async () => {
      mockRestablecerContrasenia.mockRejectedValue("boom");

      render(<ResetPasswordPage />);
      fillMatchingPasswords();
      submitResetForm();

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          "Ocurrió un error inesperado.",
        );
      });
      expect(document.querySelector(".alert-error")).not.toBeInTheDocument();
    });
  });

  describe("passwordError (inline live-validation) — unchanged, out of scope", () => {
    it("still renders inline (not as a toast) when the password is too short", () => {
      render(<ResetPasswordPage />);

      fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
        target: { value: "short" },
      });

      expect(
        screen.getByText("La contraseña debe tener al menos 8 caracteres."),
      ).toBeInTheDocument();
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it("still renders inline (not as a toast) when passwords differ, and still disables submit", () => {
      render(<ResetPasswordPage />);

      fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText("Confirmar contraseña"), {
        target: { value: "password456" },
      });

      expect(
        screen.getByText("Las contraseñas no coinciden."),
      ).toBeInTheDocument();
      expect(mockShowError).not.toHaveBeenCalled();
      expect(
        screen.getByRole("button", { name: /restablecer contraseña/i }),
      ).toBeDisabled();
    });
  });

  describe("invalid token", () => {
    it("shows the token-invalid card, not a toast", () => {
      mockToken = null;

      render(<ResetPasswordPage />);

      expect(screen.getByText(/token no válido/i)).toBeInTheDocument();
      expect(mockShowError).not.toHaveBeenCalled();
    });
  });
});
