/**
 * Smoke test: admin login → dashboard → members page.
 *
 * Verifies the core admin navigation flow works end-to-end:
 * 1. Login as admin demo persona.
 * 2. Dashboard loads with expected content.
 * 3. Navigate to /members and confirm the page renders.
 *
 * This is a deterministic smoke test — it covers the happy path only.
 * Full regression coverage belongs in unit tests.
 */

import { test, expect } from "@playwright/test";

test.describe("Admin smoke", () => {
  test("login as admin, reach dashboard, open members page", async ({ page }) => {
    // ── Step 1: Navigate to login page ──
    await page.goto("/login");
    // Wait for auth skeleton to resolve and the form to render (stable user-visible control)
    await expect(page.getByLabel(/correo electrónico/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /bienvenido/i })).toBeVisible();

    // ── Step 2: Fill in admin credentials ──
    await page.getByLabel(/correo electrónico/i).fill("admin@cataclub.com");
    await page.getByRole("textbox", { name: /contraseña/i }).fill("admin123");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();

    // ── Step 3: Verify redirect to dashboard ──
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /panel de control/i })).toBeVisible();

    // ── Step 4: Navigate to members page via nav link ──
    // Use exact name to match the header "Miembros" link, not the dashboard
    // quick action "Gestionar Miembros" which has a different accessible name.
    await page.getByRole("link", { name: "Miembros", exact: true }).click();
    await expect(page).toHaveURL(/\/members/);
    await expect(page.getByRole("heading", { name: /miembros del club/i })).toBeVisible();

    // ── Step 5: Navigate to attendance page ──
    await page.getByRole("link", { name: "Horarios y Asistencia", exact: true }).click();
    await expect(page).toHaveURL(/\/attendance/);
    await expect(page.getByRole("heading", { name: /horarios y asistencia/i })).toBeVisible();
    // Verify domain note is present
    await expect(page.getByText(/modelo de dominio/i)).toBeVisible();
  });
});
