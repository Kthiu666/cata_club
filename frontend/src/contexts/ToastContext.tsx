/**
 * ToastContext — root-mounted transient toast notifications (error/success).
 *
 * Two separate contexts share one provider:
 *  - the public `showToast`/`showError`/`showSuccess` actions (`useToast()`),
 *    consumed by pages that need to surface feedback — mirrors `useAuth()`'s
 *    "throw outside provider" contract.
 *  - the internal `toasts` array + `removeToast` (`useToastState()`),
 *    consumed by the presentational `ToastContainer` (added separately) to
 *    render the stack and wire its manual close button.
 *
 * Every toast auto-dismisses after `TOAST_DURATION_MS` unless a per-call
 * `duration` override is given. Timers are tracked per-toast in a ref map,
 * cleared on manual close (`removeToast`) and swept on provider unmount so
 * no `setState` fires after unmount.
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastVariant = "error" | "success" | "info" | "warning";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

export interface ShowToastOptions {
  variant: ToastVariant;
  message: string;
  /** Overrides `TOAST_DURATION_MS` for this toast only. */
  duration?: number;
}

export interface ToastContextValue {
  showToast: (options: ShowToastOptions) => void;
  showError: (message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
}

export interface ToastStateValue {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Shared default auto-dismiss duration, identical for both variants. */
export const TOAST_DURATION_MS = 4500;

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

const ToastActionsContext = createContext<ToastContextValue | null>(null);
const ToastStateContext = createContext<ToastStateValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ variant, message, duration = TOAST_DURATION_MS }: ShowToastOptions) => {
      const id = `toast-${++counterRef.current}`;
      setToasts((prev) => [{ id, variant, message }, ...prev]);

      const timer = setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, timer);
    },
    [removeToast],
  );

  const showError = useCallback(
    (message: string, duration?: number) => {
      showToast({ variant: "error", message, duration });
    },
    [showToast],
  );

  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      showToast({ variant: "success", message, duration });
    },
    [showToast],
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => {
      showToast({ variant: "info", message, duration });
    },
    [showToast],
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => {
      showToast({ variant: "warning", message, duration });
    },
    [showToast],
  );

  // Sweep all pending timers on unmount so no removeToast/setState fires
  // after the provider is gone.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const actions: ToastContextValue = { showToast, showError, showSuccess, showInfo, showWarning };
  const state: ToastStateValue = { toasts, removeToast };

  return (
    <ToastActionsContext.Provider value={actions}>
      <ToastStateContext.Provider value={state}>{children}</ToastStateContext.Provider>
    </ToastActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Access the toast actions. Must be called within a ToastProvider.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastActionsContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

/**
 * Internal — the current toast stack + manual dismiss, for `ToastContainer`
 * only. Not part of the public `useToast()` contract.
 */
export function useToastState(): ToastStateValue {
  const ctx = useContext(ToastStateContext);
  if (!ctx) {
    throw new Error("useToastState must be used within a ToastProvider");
  }
  return ctx;
}
