/**
 * The assistant must stay reachable WITHOUT a session.
 *
 * `POST /chatbot/consultar` is public on the backend, and the questions it
 * answers ("¿cómo inicio sesión?", "¿cuáles son los horarios?") are exactly
 * the ones asked by someone who does not have an account yet. When the widget
 * moved out of the root layout and into `AppShell`, that audience lost it
 * entirely. These tests pin the two halves of the fix: a public surface can
 * open it, and it does NOT come back as a floating action button.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HelpChatLauncher from "../HelpChatLauncher";

vi.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const mockConsultarChatbot = vi.fn();

vi.mock("@/services/api", () => ({
  consultarChatbot: (...args: unknown[]) => mockConsultarChatbot(...args),
}));

describe("HelpChatLauncher", () => {
  beforeEach(() => {
    mockConsultarChatbot.mockReset().mockResolvedValue({ reply: "Entrenamos de lunes a sábado." });
  });

  it("keeps the panel closed until the visitor asks for it", () => {
    render(<HelpChatLauncher variant="quiet" />);

    expect(screen.queryByRole("dialog", { name: "Chat de ayuda" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /asistente/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("opens and closes the assistant from its own trigger", () => {
    render(<HelpChatLauncher variant="quiet" />);

    fireEvent.click(screen.getByRole("button", { name: /asistente/i }));
    expect(screen.getByRole("dialog", { name: "Chat de ayuda" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar chat de ayuda" }));
    expect(screen.queryByRole("dialog", { name: "Chat de ayuda" })).not.toBeInTheDocument();
  });

  it("offers the logged-out visitor the two questions the FAQ answers without a role", () => {
    render(<HelpChatLauncher variant="quiet" />);
    fireEvent.click(screen.getByRole("button", { name: /asistente/i }));

    expect(screen.getByRole("button", { name: "¿Cómo inicio sesión?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "¿Cuáles son los horarios?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hablar con el club" })).toBeInTheDocument();
  });

  it("never renders a floating action button — the trigger is inline", () => {
    const { container } = render(<HelpChatLauncher variant="landing" label="Pregunta al asistente" />);

    const trigger = screen.getByRole("button", { name: "Pregunta al asistente" });
    expect(trigger.className).not.toMatch(/\bfixed\b/);
    // Closed state paints nothing else at all: no invisible bubble parked in
    // a corner over someone's controls.
    expect(container.querySelectorAll("[class*='fixed']")).toHaveLength(0);
  });

  it("borrows the landing's own quiet button so it cannot outrank the WhatsApp CTA", () => {
    render(<HelpChatLauncher variant="landing" />);

    expect(screen.getByRole("button", { name: /asistente/i }).className).toContain(
      "landing-button-quiet",
    );
  });
});
