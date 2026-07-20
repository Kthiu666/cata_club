/**
 * Vitest setup — runs before every test file.
 *
 * Registers DOM-specific jest-dom matchers (toBeInTheDocument, toHaveClass, etc.)
 * on vitest's `expect`. Harmless in node‑environment tests — the matchers are only
 * called by jsdom test files that actually query for DOM elements.
 */
import "@testing-library/jest-dom/vitest";
