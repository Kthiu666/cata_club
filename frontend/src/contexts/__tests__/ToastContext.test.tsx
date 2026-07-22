/**
 * Unit tests for ToastContext — public useToast() contract, internal
 * useToastState() (consumed by the future ToastContainer), fake-timer
 * auto-dismiss timing, manual close, and unmount timer sweep.
 *
 * @vitest-environment jsdom
 */

import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast, useToastState, TOAST_DURATION_MS } from "@/contexts/ToastContext";

function OutsideProviderHarness(): ReactElement {
  useToast();
  return <div>should not render</div>;
}

function Harness(): ReactElement {
  const toast = useToast();
  const { toasts, removeToast } = useToastState();

  return (
    <div>
      <button type="button" onClick={() => toast.showError("Error message")}>
        trigger-error
      </button>
      <button type="button" onClick={() => toast.showSuccess("Success message")}>
        trigger-success
      </button>
      <button
        type="button"
        onClick={() =>
          toast.showToast({ variant: "error", message: "Custom duration", duration: 8000 })
        }
      >
        trigger-custom-duration
      </button>
      <ul>
        {toasts.map((item) => (
          <li key={item.id} data-testid={`toast-${item.id}`}>
            <span data-testid="variant">{item.variant}</span>
            <span data-testid="message">{item.message}</span>
            <button type="button" onClick={() => removeToast(item.id)}>
              close-{item.id}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderHarness() {
  return render(
    <ToastProvider>
      <Harness />
    </ToastProvider>,
  );
}

describe("useToast outside ToastProvider", () => {
  it("throws when called without a ToastProvider ancestor", () => {
    // React logs the thrown render error to console.error even though the
    // exception also propagates to render() itself — silence that expected
    // noise for this one assertion.
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<OutsideProviderHarness />)).toThrow(
      "useToast must be used within a ToastProvider",
    );

    consoleErrorSpy.mockRestore();
  });
});

describe("ToastContext", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("showError / showSuccess", () => {
    it("adds an item with variant 'error' and the given message", () => {
      renderHarness();

      fireEvent.click(screen.getByText("trigger-error"));

      expect(screen.getByTestId("variant")).toHaveTextContent("error");
      expect(screen.getByTestId("message")).toHaveTextContent("Error message");
    });

    it("adds an item with variant 'success' and the given message", () => {
      renderHarness();

      fireEvent.click(screen.getByText("trigger-success"));

      expect(screen.getByTestId("variant")).toHaveTextContent("success");
      expect(screen.getByTestId("message")).toHaveTextContent("Success message");
    });
  });

  describe("manual close", () => {
    it("removes the toast immediately and clears its pending auto-dismiss timer", () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      renderHarness();

      fireEvent.click(screen.getByText("trigger-error"));
      expect(screen.queryByTestId("variant")).toBeInTheDocument();

      fireEvent.click(screen.getByText(/^close-/));

      expect(screen.queryByTestId("variant")).not.toBeInTheDocument();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe("unmount sweep", () => {
    it("clears all pending timers on provider unmount, no post-unmount removal", () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const { unmount } = renderHarness();

      fireEvent.click(screen.getByText("trigger-error"));
      fireEvent.click(screen.getByText("trigger-success"));

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe("auto-dismiss timing", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("does NOT remove the toast at 4499ms", () => {
      renderHarness();
      fireEvent.click(screen.getByText("trigger-error"));

      act(() => {
        vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
      });

      expect(screen.queryByTestId("variant")).toBeInTheDocument();
    });

    it("removes the toast at exactly 4500ms (TOAST_DURATION_MS)", () => {
      renderHarness();
      fireEvent.click(screen.getByText("trigger-error"));

      act(() => {
        vi.advanceTimersByTime(TOAST_DURATION_MS);
      });

      expect(screen.queryByTestId("variant")).not.toBeInTheDocument();
    });

    it("respects an explicit duration override instead of the default", () => {
      renderHarness();
      fireEvent.click(screen.getByText("trigger-custom-duration"));

      act(() => {
        vi.advanceTimersByTime(TOAST_DURATION_MS);
      });
      expect(screen.queryByTestId("variant")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(8000 - TOAST_DURATION_MS);
      });
      expect(screen.queryByTestId("variant")).not.toBeInTheDocument();
    });
  });
});
