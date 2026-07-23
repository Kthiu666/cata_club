import { describe, it, expect } from "vitest";
import { slugifyLabel } from "../wizard-fields";

describe("slugifyLabel", () => {
  it("lowercases and strips accents", () => {
    expect(slugifyLabel("Cédula de Identidad")).toBe("cedula-de-identidad");
  });

  it("collapses non-alphanumeric runs into a single hyphen", () => {
    expect(slugifyLabel("Teléfono de Emergencia*")).toBe("telefono-de-emergencia");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugifyLabel("¿Nombre?")).toBe("nombre");
  });

  it("produces distinct ids for distinct labels", () => {
    expect(slugifyLabel("Nombres")).not.toBe(slugifyLabel("Apellidos"));
  });
});
