/**
 * AuthShell — the template all four public auth screens inherit.
 *
 * The authority for these screens is the login stage of
 * `docs/ux/prototipo-rediseno.html`, NOT the smaller `docs/ux/prototipos/`
 * login — EXCEPT for the two things the product owner overruled after seeing
 * the built screen. These tests pin both the overrides and the prototype
 * details that must survive them:
 *
 *  1. The composition FILLS THE VIEWPORT. It first shipped bounded at the
 *     prototype's `min-height:660px`, centred as an artboard, and was
 *     rejected: *"por qué el login no ocupa toda la pantalla"*. So there must
 *     be no max-width cap and no bounded min-height on the composition.
 *  2. The headline uses TYPOGRAPHIC DOUBLE QUOTES, never guillemets —
 *     *"esos signos de mayor y menor se ven muy mal"*.
 *  3. The headline is 42px on desktop / 30px on phones. It shipped at 21px —
 *     half its intended size — which is what made the screen read as broken.
 *  4. The coal panel is WIDER than the form panel (`flex:1.1` vs `flex:1`),
 *     not an equal half.
 *  5. The card carries the red "Panel de gestión" eyebrow, and the single
 *     figure is `yearsSinceFounding()` — a real, public, unauthenticated fact
 *     — rendered as an inline number + caption. It is NOT a student count: no
 *     endpoint an anonymous visitor can call returns one, and a fabricated
 *     figure is worse than no figure.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AuthShell from "@/components/auth/AuthShell";
import { yearsSinceFounding } from "@/app/landing/landing-config";

function renderShell(): void {
  render(
    <AuthShell title="Bienvenido de nuevo" subtitle="Inicie sesión para continuar" note="Nota">
      <button type="submit">Iniciar sesión</button>
    </AuthShell>,
  );
}

describe("AuthShell", () => {
  it("fills the viewport instead of floating as a bounded, centred artboard", () => {
    renderShell();

    const composition = screen.getByTestId("auth-composition");
    expect(composition.className).toContain("min-h-screen");
    expect(composition.className).toContain("w-full");
    // The rejected version capped the composition and bounded its height.
    expect(composition.className).not.toMatch(/max-w-\[\d+px\]/);
    expect(composition.className).not.toContain("min-h-[660px]");
  });

  it("renders the motto with typographic double quotes, never guillemets", () => {
    renderShell();

    const headline = screen.getByTestId("auth-headline");
    expect(headline.textContent).toContain("“");
    expect(headline.textContent).toContain("”");
    expect(headline.textContent).not.toContain("«");
    expect(headline.textContent).not.toContain("»");
  });

  it("renders the headline at 42px on desktop and 30px on phones", () => {
    renderShell();

    const headline = screen.getByTestId("auth-headline");
    expect(headline.className).toContain("min-[980px]:text-[42px]");
    expect(headline.className).toContain("text-[30px]");
    expect(headline.className).toContain("font-extrabold");
    expect(headline).toHaveTextContent("Formando");
  });

  it("makes the coal panel wider than the form panel, as flex:1.1 vs flex:1", () => {
    renderShell();

    expect(screen.getByTestId("auth-panel-dark").className).toContain("min-[980px]:flex-[1.1_1_0%]");
  });

  it("stacks the coal panel on phones instead of hiding it", () => {
    renderShell();

    // `@media (max-width:980px){ .auth{flex-direction:column} }` — the panel
    // moves above the form, so it must never carry a `hidden` base class.
    const dark = screen.getByTestId("auth-panel-dark");
    expect(dark.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(screen.getByTestId("auth-composition").className).toContain("min-[980px]:flex-row");
  });

  it("renders the red eyebrow the form card is headed by", () => {
    renderShell();

    const eyebrow = screen.getByText("Panel de gestión");
    expect(eyebrow.className).toContain("text-cata-red");
    expect(eyebrow.className).toContain("uppercase");
  });

  it("renders the single figure from the founding date, with its caption", () => {
    renderShell();

    const figure = screen.getByTestId("auth-figure");
    expect(figure).toHaveTextContent(String(yearsSinceFounding()));
    expect(screen.getByText("años formando deportistas")).toBeInTheDocument();
  });

  it("never claims a student count, which no public endpoint can produce", () => {
    renderShell();

    expect(screen.queryByText(/estudiantes inscritos/i)).not.toBeInTheDocument();
  });

  it("keeps the motto, the exit link and the card contents the four screens share", () => {
    renderShell();

    expect(screen.getByText(/Formando/)).toBeInTheDocument();
    expect(screen.getByText("campeones")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /volver al sitio/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeInTheDocument();
    expect(screen.getByText("Inicie sesión para continuar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByText("Nota")).toBeInTheDocument();
  });
});
