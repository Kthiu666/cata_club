/**
 * Component tests for NotificationBell — now presentational (data comes
 * from props, fed by the useNotificaciones hook one level up in Header; see
 * useNotificaciones.test.ts for the data/poll/mark-read behavior).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationBell from "@/components/NotificationBell";
import type { Notificacion } from "@/types/domain";

function makeNotificacion(overrides: Partial<Notificacion> = {}): Notificacion {
  return {
    id: 1,
    tipo: "JUSTIFICATIVO_APROBADO",
    mensaje: "Tu justificativo de 7/2026 fue aprobado.",
    leida: false,
    fechaCreacion: "2026-07-19T10:00:00Z",
    entidadRelacionadaId: 5,
    ...overrides,
  };
}

describe("NotificationBell", () => {
  it("shows no unread badge when there are no notifications", () => {
    render(<NotificationBell notificaciones={[]} loadError={false} onMarkRead={vi.fn()} />);

    expect(screen.queryByText(/sin leer/i)).not.toBeInTheDocument();
  });

  it("shows the unread count badge", () => {
    render(
      <NotificationBell
        notificaciones={[makeNotificacion({ id: 1, leida: false }), makeNotificacion({ id: 2, leida: true })]}
        loadError={false}
        onMarkRead={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/1 sin leer/i)).toBeInTheDocument();
  });

  it("opens the dropdown and lists notifications on click", () => {
    render(
      <NotificationBell notificaciones={[makeNotificacion()]} loadError={false} onMarkRead={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

    expect(screen.getByText("Tu justificativo de 7/2026 fue aprobado.")).toBeInTheDocument();
    expect(screen.getByText("Justificativo aprobado")).toBeInTheDocument();
  });

  it("calls onMarkRead when an unread notification is clicked", () => {
    const onMarkRead = vi.fn();
    render(
      <NotificationBell
        notificaciones={[makeNotificacion({ id: 7, leida: false })]}
        loadError={false}
        onMarkRead={onMarkRead}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));
    fireEvent.click(screen.getByText("Tu justificativo de 7/2026 fue aprobado."));

    expect(onMarkRead).toHaveBeenCalledWith(7);
  });

  it("does not call onMarkRead for an already-read notification", () => {
    const onMarkRead = vi.fn();
    render(
      <NotificationBell
        notificaciones={[makeNotificacion({ id: 7, leida: true })]}
        loadError={false}
        onMarkRead={onMarkRead}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));
    fireEvent.click(screen.getByText("Tu justificativo de 7/2026 fue aprobado."));

    expect(onMarkRead).not.toHaveBeenCalled();
  });

  it("shows an empty state when loadError is set and there are no notifications", () => {
    render(<NotificationBell notificaciones={[]} loadError={true} onMarkRead={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

    expect(screen.getByText(/no se pudieron cargar/i)).toBeInTheDocument();
  });

  // --- Trigger theming (variant prop) ---
  // Header.tsx renders this on a dark `bg-cata-dark/95` topbar; AppShell.tsx
  // renders it on a light `bg-cata-surface` topbar. The trigger's idle/hover
  // colors must branch so the icon stays legible in both contexts.

  it("defaults to dark-topbar trigger styling (Header usage, unchanged)", () => {
    render(<NotificationBell notificaciones={[]} loadError={false} onMarkRead={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: /notificaciones/i });

    expect(trigger).toHaveClass("text-white/65");
    expect(trigger).not.toHaveClass("text-cata-text/65");
  });

  it("applies light-topbar trigger styling when variant is light (AppShell usage)", () => {
    render(<NotificationBell notificaciones={[]} loadError={false} onMarkRead={vi.fn()} variant="light" />);

    const trigger = screen.getByRole("button", { name: /notificaciones/i });

    expect(trigger).toHaveClass("text-cata-text/65");
    expect(trigger).not.toHaveClass("text-white/65");
  });

  // --- Pagination (Issue #41) ---

  function buildNotificaciones(count: number): Notificacion[] {
    return Array.from({ length: count }, (_, i) => makeNotificacion({ id: i + 1, mensaje: `Mensaje ${i + 1}` }));
  }

  describe("pagination (Issue #41)", () => {
    it("renders only 10 notifications initially and shows pagination controls", () => {
      render(<NotificationBell notificaciones={buildNotificaciones(15)} loadError={false} onMarkRead={vi.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

      expect(screen.getByText("Mensaje 1")).toBeInTheDocument();
      expect(screen.queryByText("Mensaje 11")).not.toBeInTheDocument();
      expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
    });

    it("advances to the next page and persists across an unrelated re-render", () => {
      const fifteen = buildNotificaciones(15);
      const { rerender } = render(
        <NotificationBell notificaciones={fifteen} loadError={false} onMarkRead={vi.fn()} />,
      );

      fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));
      fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
      expect(screen.getByText("Mensaje 11")).toBeInTheDocument();

      rerender(<NotificationBell notificaciones={fifteen} loadError={false} onMarkRead={vi.fn()} />);
      expect(screen.getByText("Mensaje 11")).toBeInTheDocument();
      expect(screen.queryByText("Mensaje 1")).not.toBeInTheDocument();
    });
  });
});
