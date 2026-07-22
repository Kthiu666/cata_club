/**
 * Component tests for ToastContainer — renders the live toast stack from
 * `ToastProvider`'s internal state, exposes variant-correct ARIA roles,
 * stacks newest-on-top, and wires the manual close button to `removeToast`.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { ToastProvider, useToast } from "@/contexts/ToastContext";
import ToastContainer from "@/components/ToastContainer";

function Harness(): React.ReactElement {
  const toast = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast.showError("Algo salió mal")}>
        Trigger error
      </button>
      <button type="button" onClick={() => toast.showSuccess("Todo bien")}>
        Trigger success
      </button>
      <ToastContainer />
    </div>
  );
}

function renderHarness(): void {
  render(
    <ToastProvider>
      <Harness />
    </ToastProvider>,
  );
}

describe("ToastContainer", () => {
  it("renders nothing when there are no toasts", () => {
    renderHarness();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders an error toast with role=alert and the message", () => {
    renderHarness();

    fireEvent.click(screen.getByText("Trigger error"));

    const toast = screen.getByRole("alert");
    expect(toast).toHaveTextContent("Algo salió mal");
  });

  it("renders a success toast with role=status and the message", () => {
    renderHarness();

    fireEvent.click(screen.getByText("Trigger success"));

    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Todo bien");
  });

  it("stacks multiple toasts with the newest rendered first (on top)", () => {
    renderHarness();

    fireEvent.click(screen.getByText("Trigger error"));
    fireEvent.click(screen.getByText("Trigger success"));

    const toasts = [
      ...screen
        .getByRole("alert")
        .ownerDocument.querySelectorAll('[role="alert"], [role="status"]'),
    ];
    expect(toasts).toHaveLength(2);
    // Newest (success) toast is prepended, so it appears first in the DOM.
    expect(toasts[0]).toHaveTextContent("Todo bien");
    expect(toasts[1]).toHaveTextContent("Algo salió mal");
  });

  it("has a keyboard-reachable close button with the expected aria-label", () => {
    renderHarness();

    fireEvent.click(screen.getByText("Trigger error"));

    const toast = screen.getByRole("alert");
    const closeButton = within(toast).getByRole("button", {
      name: "Cerrar notificación",
    });
    expect(closeButton).toBeInTheDocument();
  });

  it("removes the toast immediately when the close button is activated", () => {
    renderHarness();

    fireEvent.click(screen.getByText("Trigger error"));
    const toast = screen.getByRole("alert");
    const closeButton = within(toast).getByRole("button", {
      name: "Cerrar notificación",
    });

    fireEvent.click(closeButton);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the other toast visible when only one is dismissed", () => {
    renderHarness();

    fireEvent.click(screen.getByText("Trigger error"));
    fireEvent.click(screen.getByText("Trigger success"));

    const errorToast = screen.getByRole("alert");
    const closeButton = within(errorToast).getByRole("button", {
      name: "Cerrar notificación",
    });
    fireEvent.click(closeButton);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Todo bien");
  });
});
