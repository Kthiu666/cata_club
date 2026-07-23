/**
 * ToastContainer — presentational stack for `ToastProvider`'s live toasts.
 * Fixed top-right, above `ConfirmDialog` (`z-50`) so a toast stays visible
 * even while a confirm dialog is open. Newest toast is prepended by
 * `ToastContext`, so it renders first (on top) in the stack. Each toast
 * exposes a manual close button in addition to its own auto-dismiss timer.
 */

"use client";

import { X } from "lucide-react";
import { useToastState, type ToastItem } from "@/contexts/ToastContext";

const VARIANT_CLASSES: Record<ToastItem["variant"], string> = {
  error: "toast-error",
  success: "toast-success",
  info: "toast-info",
  warning: "toast-warning",
};

// Screen-reader role per variant: errors interrupt (alert), success/info confirm (status), warning interrupts (alert).
const VARIANT_ROLES: Record<ToastItem["variant"], "alert" | "status"> = {
  error: "alert",
  success: "status",
  info: "status",
  warning: "alert",
};

export default function ToastContainer(): React.ReactElement | null {
  const { toasts, removeToast } = useToastState();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={VARIANT_ROLES[toast.variant]}
          className={`${VARIANT_CLASSES[toast.variant]} animate-toast-in`}
        >
          <p className="flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            aria-label="Cerrar notificación"
            className="shrink-0 text-current/70 transition-colors hover:text-current"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
