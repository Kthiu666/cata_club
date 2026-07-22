import { expect, test, type Page, type Route } from "@playwright/test";

const MOCK_ACCESS_TOKEN = "mock-header.mock-payload.mock-signature";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const MOCK_SESSION = {
  user: {
    id: "2",
    name: "Carla Entrenadora",
    email: "trainer@cataclub.test",
    role: "trainer" as const,
    representanteId: null,
  },
  roles: ["ENTRENADOR"],
  loggedInAt: "2026-07-21T00:00:00.000Z",
};

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockTrainerAttendanceRuntime(page: Page): Promise<void> {
  await page.context().addCookies([{
    name: "access_token",
    value: MOCK_ACCESS_TOKEN,
    url: BASE_URL,
  }]);
  await page.route("**/api/auth/session", (route: Route) => fulfillJson(route, MOCK_SESSION));
  await page.route("**/api/attendance/schedules", (route: Route) => fulfillJson(route, [
    {
      id: 11,
      diaSemana: "lun",
      horaInicio: "18:00",
      horaFin: "19:00",
      entrenadorId: 2,
      entrenadorNombre: "Carla Entrenadora",
    },
  ]));
  await page.route("**/api/ranking/niveles", (route: Route) => fulfillJson(route, [
    { id: 7, numeroNivel: 1, nivelCategoria: "principiante", nombre: "Elite", personasActuales: 1 },
  ]));
  await page.route("**/api/ranking/niveles/7/tabla", (route: Route) => fulfillJson(route, [
    { personaId: 9, personaNombreCompleto: "Ana López", puntosTotales: 0, posicion: 1 },
  ]));
  await page.route("**/api/ranking/notificaciones/mias", (route: Route) => fulfillJson(route, []));
}

test("trainer directly selects every attendance state at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockTrainerAttendanceRuntime(page);

  await page.goto("/trainer/attendance");
  await page.getByRole("button", { name: /lunes/i }).click();
  await page.getByRole("button", { name: /elite/i }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  const stateGroup = page.getByRole("group", { name: "Estado de asistencia de Ana López" });
  await expect(stateGroup).toBeVisible();

  for (const name of ["Presente", "Ausente", "Tardanza", "Justificado"]) {
    const stateControl = stateGroup.getByRole("button", { name, exact: true });
    await expect(stateControl).toBeVisible();
    await stateControl.click();
    await expect(stateControl).toHaveAttribute("aria-pressed", "true");
  }
});

test("trainer discovers mobile navigation and Justificado guidance at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockTrainerAttendanceRuntime(page);

  await page.goto("/trainer/attendance");

  const menu = page.getByRole("button", { name: "Abrir menú principal" });
  await expect(menu).toHaveText("Menú");
  await menu.click();
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar menú" }).click();

  await page.getByRole("button", { name: /lunes/i }).click();
  await page.getByRole("button", { name: /elite/i }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Ayuda sobre el estado Justificado" }).click();

  const help = page.getByRole("region", { name: "Ayuda sobre el estado Justificado" });
  await expect(help).toContainText("no modifica la validación ni el significado actual");
});
