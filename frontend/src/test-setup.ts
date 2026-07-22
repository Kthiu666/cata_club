/**
 * Vitest setup — runs before every test file.
 *
 * Registers DOM-specific jest-dom matchers (toBeInTheDocument, toHaveClass, etc.)
 * on vitest's `expect`. Harmless in node‑environment tests — the matchers are only
 * called by jsdom test files that actually query for DOM elements.
 */
import "@testing-library/jest-dom/vitest";

// jsdom does not implement HTMLDialogElement.showModal()/close() (only the
// `open` attribute reflection) — polyfill the minimum needed for components
// using native <dialog> modals so their tests can open/close them. Guarded
// because some test files run under the `node` environment, where this
// global doesn't exist at all.
if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement): void {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement): void {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
}
