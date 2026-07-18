/**
 * Landing page E2E smoke test.
 *
 * Verifies the landing page renders correctly and the main CTA navigates
 * to the login page. This is deterministic and uses semantic queries only.
 */

import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders hero and navigates to login via CTA", async ({ page }) => {
    await page.goto("/");

    // Assert main heading is visible (hero title)
    await expect(
      page.getByRole("heading", { name: /cata club/i, level: 1 })
    ).toBeVisible();

    // Assert at least one CTA link is present (hero has "Iniciar Sesión")
    const cta = page.getByRole("link", { name: /iniciar sesión/i }).first();
    await expect(cta).toBeVisible();

    // Navigate to login via CTA
    await cta.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    // Assert login form has rendered
    await expect(
      page.getByRole("heading", { name: /bienvenido/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
