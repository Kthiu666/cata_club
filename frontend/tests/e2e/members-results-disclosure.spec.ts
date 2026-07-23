import { expect, test, type Page, type Route } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const MOCK_ACCESS_TOKEN = "mock-header.mock-payload.mock-signature";
const ACCOUNT = {
  id: "1",
  role: "representante",
  nombres: "María",
  apellidos: "González",
  email: "maria@example.test",
  telefono: "0999999999",
  estudiantes: [{
    id: "10",
    nombres: "Sofía",
    apellidos: "González",
    grupoId: null,
    activo: true,
    membresia: {
      tipo: "mensual",
      estado: "activa",
      fechaInicio: "2026-07-01",
      fechaFin: "2026-07-31",
      monto: 85,
    },
    ultimoPago: null,
  }],
};

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockMembersRuntime(page: Page, accounts = [ACCOUNT], personasCapped = false): Promise<void> {
  await page.context().addCookies([{ name: "access_token", value: MOCK_ACCESS_TOKEN, url: BASE_URL }]);
  await page.route("**/api/auth/session", (route: Route) => fulfillJson(route, {
    user: { id: "1", name: "Admin Demo", email: "admin@example.test", role: "admin", representanteId: null },
    roles: ["ADMINISTRADOR"],
    loggedInAt: "2026-07-21T00:00:00.000Z",
  }));
  await page.route("**/api/members", (route: Route) => fulfillJson(route, { accounts, niveles: [], personasCapped }));
  await page.route("**/api/ranking/notificaciones/mias", (route: Route) => fulfillJson(route, []));
}

test("members disclose visible results and essential membership information at 390px without pagination", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockMembersRuntime(page);

  await page.goto("/members");

  await expect(page.getByRole("status", { name: "Resultados mostrados" })).toHaveText("1 resultados mostrados");
  const accountIdentity = page.locator("td").filter({ hasText: "María González" });
  await expect(accountIdentity.getByText("María González")).toBeVisible();
  await expect(accountIdentity.getByText("Activo", { exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Contacto" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: /paginación/i })).toHaveCount(0);

  // Membership info now lives in the account's Editar modal (the row no
  // longer expands) — one card per student under "Estudiantes a cargo".
  // Two "Editar" triggers exist per row (desktop + a mobile-visible
  // duplicate, since the desktop one's whole column is CSS-hidden below
  // `sm`); at this viewport only the mobile one is actually visible.
  await page.locator('button[aria-label="Editar"]:visible').click();
  await expect(page.getByRole("dialog").getByText("Membresía", { exact: true })).toBeVisible();
});

test("members show an incomplete-coverage notice when 200 personas collapse into one account", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockMembersRuntime(page, [ACCOUNT], true);

  await page.goto("/members");

  await expect(page.getByRole("status", { name: "Resultados mostrados" })).toHaveText("1 resultados mostrados");
  await expect(page.getByText(/La fuente devuelve hasta 200 registros/)).toContainText("puede estar incompleto");
  await expect(page.getByRole("navigation", { name: /paginación/i })).toHaveCount(0);
});
