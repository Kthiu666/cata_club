/**
 * Component tests for RegisterPage.
 *
 * Covers the demo registration flow:
 *   - filling + submitting the form transitions to success state
 *   - clicking "Inscribirse" calls login with demo credentials and navigates
 *   - the navigating guard prevents double-click / repeated activation
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "@/app/register/page";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
const mockRouter = { push: mockPush };

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

const mockLogin = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    session: null,
    isAuthenticated: false,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Fill required fields and submit the registration form. */
function submitDemoForm() {
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "test@catclub.com" },
  });
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("Confirmar Contraseña"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("Nombres"), {
    target: { value: "Juan" },
  });
  fireEvent.change(screen.getByLabelText("Apellidos"), {
    target: { value: "Pérez" },
  });
  fireEvent.change(screen.getByLabelText("Cédula de Identidad"), {
    target: { value: "1712345678" },
  });
  fireEvent.change(screen.getByLabelText("Fecha de Nacimiento"), {
    target: { value: "2000-01-15" },
  });
  fireEvent.change(screen.getByLabelText("Teléfono Celular"), {
    target: { value: "0991234567" },
  });

  fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
}

/**
 * Submit the form and wait for the 1.5 s demo delay to resolve.
 * Returns the "Inscribirse" button once success state is visible.
 */
async function submitAndReachSuccess(): Promise<HTMLElement> {
  render(<RegisterPage />);
  submitDemoForm();
  await screen.findByText(/registro de demostración completado/i, undefined, {
    timeout: 3000,
  });
  return screen.getByRole("button", { name: /inscribirse/i });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RegisterPage", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockLogin.mockReset();
    // Simulate successful login by default
    mockLogin.mockReturnValue({
      user: {
        id: "user-natural-1",
        name: "Usuario Natural",
        email: "natural@cataclub.com",
        role: "responsable_pago",
      },
      token: "demo-token-test",
      loggedInAt: new Date().toISOString(),
    });
  });

  it("renders the registration form by default", () => {
    render(<RegisterPage />);

    expect(
      screen.getByRole("heading", { name: /crear su cuenta/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /crear cuenta/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/registro de demostración completado/i),
    ).not.toBeInTheDocument();
  });

  it("shows success state after form submission", async () => {
    render(<RegisterPage />);

    submitDemoForm();

    expect(
      await screen.findByText(/registro de demostración completado/i, undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /inscribirse/i }),
    ).toBeInTheDocument();
  });

  describe("handleContinueToEnrollment", () => {
    it("logs in with demo credentials and navigates to /student/enroll", async () => {
      const button = await submitAndReachSuccess();

      fireEvent.click(button);

      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith(
        "natural@cataclub.com",
        "natural123",
      );
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/student/enroll");
    });

    it("shows error when login fails and does NOT navigate", async () => {
      mockLogin.mockReturnValue(null); // Simulate failed login
      const button = await submitAndReachSuccess();

      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByText(/no se pudo iniciar la sesión/i),
        ).toBeInTheDocument();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("disables the button and shows loading text during navigation", async () => {
      const button = await submitAndReachSuccess();

      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent(/redirigiendo/i);
      });
    });

    it("prevents repeated activation (double-click guard)", async () => {
      const button = await submitAndReachSuccess();

      // Click once — this triggers login and push
      fireEvent.click(button);

      // Wait for the re-render with navigating=true
      await waitFor(() => {
        expect(button).toBeDisabled();
      });

      // Click again — the guard should prevent a second call
      fireEvent.click(button);

      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });
});
