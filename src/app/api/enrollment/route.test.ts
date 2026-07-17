import { describe, expect, it } from "vitest";
import { BLOOD_TYPES } from "@/types/enrollment";
import { POST } from "./route";

const validBody = { alumno: { nombres: "Ana", apellidos: "Pérez", cedula: "1712345678", fechaNacimiento: "2000-01-15", telefono: "0991234567" }, credencialesAlumno: { correo: "ana@example.com", contrasenia: "password8" }, fichaMedica: { tipoSangre: BLOOD_TYPES.O_POSITIVO, condicionesSalud: "", alergias: "", contactoEmergencia: "María", telefonoEmergencia: "0997654321" } };

describe("POST /api/enrollment", () => {
  it("accepts a public complete request without exposing credentials", async () => {
    const response = await POST(new Request("http://localhost/api/enrollment", { method: "POST", body: JSON.stringify(validBody) }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ enrolled: true });
    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).not.toContain(validBody.alumno.cedula);
  });

  it("rejects an incomplete body", async () => {
    const response = await POST(new Request("http://localhost/api/enrollment", { method: "POST", body: JSON.stringify({}) }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ detail: expect.any(String) }));
  });

  it("rejects a non-POST request when invoked directly", async () => {
    const response = await POST(new Request("http://localhost/api/enrollment", { method: "GET" }));
    expect(response.status).toBe(405);
  });
});
