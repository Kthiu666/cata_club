/**
 * ConfirmDialog — shared plain click-to-confirm dialog for high-consequence
 * actions (payments approve, groups remove-from-group). No typed-reason
 * input; that stays exclusive to payments' reject flow. Local `useState`
 * per consumer — no context/store/portal (no Button/Card/Input layer yet).
 */

"use client";

import { useEffect, useRef } from "react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** @default "Confirmar" */
  confirmLabel?: string;
  /** @default "Cancelar" */
  cancelLabel?: string;
  variant: "state-ok" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

// Variant -> class map, existing cata-* tokens only (no tailwind.config.ts edit).
const CONFIRM_BUTTON_CLASSES: Record<ConfirmDialogProps["variant"], string> = {
  "state-ok": "btn-primary bg-cata-state-ok hover:bg-cata-state-ok/90",
  danger: "btn-secondary border-cata-red/30 text-cata-red hover:bg-cata-red/10",
};

const HEADING_ACCENT_CLASSES: Record<ConfirmDialogProps["variant"], string> = {
  "state-ok": "text-cata-state-ok",
  danger: "text-cata-red",
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.ReactElement | null {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // Focus trap: focus confirm on open, Tab/Shift+Tab cycles the 2 buttons,
  // Escape cancels, focus returns to the trigger on close.
  useEffect(() => {
    if (!open) return;

    triggerElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = [confirmButtonRef.current, cancelButtonRef.current].filter(
        (el): el is HTMLButtonElement => el !== null,
      );
      if (focusable.length === 0) return;

      event.preventDefault();
      const currentIndex = focusable.indexOf(document.activeElement as HTMLButtonElement);
      const nextIndex =
        (currentIndex + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      focusable[nextIndex].focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      triggerElementRef.current?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cata-black/40 px-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(event) => event.stopPropagation()}
        className="card w-full max-w-sm p-6"
      >
        <h2
          id="confirm-dialog-title"
          className={`text-base font-semibold ${HEADING_ACCENT_CLASSES[variant]}`}
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-message"
          className="mt-2 text-sm text-cata-text/65"
        >
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={CONFIRM_BUTTON_CLASSES[variant]}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
