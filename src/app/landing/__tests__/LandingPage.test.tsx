/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { landingConfig } from "@/app/landing/landing-config";
import LandingPage from "@/app/landing/LandingPage";

vi.mock("next/image", (): { __esModule: boolean; default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; fill?: boolean }) => React.ReactElement } => ({
  __esModule: true,
  default: ({ priority: _priority, fill: _fill, sizes: _sizes, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; fill?: boolean }): React.ReactElement => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} {...props} />
  ),
}));

vi.mock("@/app/landing/LandingMap", (): { default: () => React.ReactElement } => ({
  default: (): React.ReactElement => <div aria-label="Mapa de ubicación de Cata Club" />,
}));

describe("LandingPage", (): void => {
  let reducedMotion = true;

  beforeEach((): void => {
    reducedMotion = true;
    vi.stubGlobal("ResizeObserver", class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    });
    vi.stubGlobal("matchMedia", vi.fn((query: string): MediaQueryList => ({
      matches: query === "(prefers-reduced-motion: reduce)" ? reducedMotion : !reducedMotion,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach((): void => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders every section in the approved order", (): void => {
    render(<LandingPage />);

    const headings = screen.getAllByRole("heading").map((heading): string | null => heading.textContent);
    expect(headings).toEqual(expect.arrayContaining([
      expect.stringMatching(/Formando campeones para la vida/i),
      "Misión y Visión",
      "Nuestros Valores",
      "Galería",
      "Horarios",
      "Ubicación",
    ]));
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders client-pending values from the centralized config", (): void => {
    render(<LandingPage />);

    expect(screen.getByText(landingConfig.stats[1].value)).toBeInTheDocument();
    expect(screen.getByText(landingConfig.stats[2].value)).toBeInTheDocument();
    expect(screen.getByText(landingConfig.schedules[0].hours)).toBeInTheDocument();
    expect(screen.getByText(landingConfig.contact.whatsapp)).toBeInTheDocument();
    expect(screen.getByText(landingConfig.contact.facebook)).toBeInTheDocument();
    expect(screen.getByText(landingConfig.contact.email)).toBeInTheDocument();
    expect(screen.getByText("Facebook")).toBeInTheDocument();
    expect(screen.queryByText("Instagram")).not.toBeInTheDocument();
  });

  it("renders each configured schedule as its own card", (): void => {
    render(<LandingPage />);

    const scheduleSection = screen.getByRole("heading", { name: "Horarios" }).closest("section");
    expect(scheduleSection).not.toBeNull();
    const scheduleCards = Array.from(scheduleSection?.querySelectorAll("article") ?? []);
    expect(scheduleCards).toHaveLength(landingConfig.schedules.length);
    landingConfig.schedules.forEach((schedule, index): void => {
      expect(scheduleCards[index]).toHaveTextContent(schedule.category);
      expect(scheduleCards[index]).toHaveTextContent(schedule.audience);
      expect(scheduleCards[index]).toHaveTextContent(schedule.hours);
      expect(scheduleCards[index]).toHaveTextContent(schedule.days);
    });
  });

  it("links every ENTRAR action to login", (): void => {
    render(<LandingPage />);

    const loginLinks = screen.getAllByText("ENTRAR").map((label): HTMLAnchorElement | null => label.closest("a"));
    expect(loginLinks).toHaveLength(2);
    loginLinks.forEach((link): void => {
      expect(link).toHaveAttribute("href", "/login");
    });
    expect(screen.getByRole("link", { name: "ENTRAR — Iniciar sesión" })).toHaveAttribute("href", "/login");
  });

  it("describes the Singapore competition image without club attribution", (): void => {
    render(<LandingPage />);

    expect(screen.getByAltText("Athletes competing in a table tennis tournament in Singapore")).toBeInTheDocument();
    expect(screen.getByText("Competencia internacional de tenis de mesa")).toBeInTheDocument();
  });

  it("exposes the active landing destination to assistive technology", (): void => {
    render(<LandingPage />);

    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps reveal content in its final state when reduced motion is preferred", (): void => {
    reducedMotion = true;

    render(<LandingPage />);

    screen.getAllByTestId("motion-section").forEach((section): void => {
      expect(section).not.toHaveAttribute("aria-hidden", "true");
      expect(section).not.toHaveStyle({ opacity: "0" });
    });
  });
});
