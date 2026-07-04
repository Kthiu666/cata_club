/**
 * Unit tests for the validateEnrollStep helper.
 *
 * Pure function — no React dependencies, easy to test.
 * Covers every wizard step, valid/invalid states, edge cases,
 * and domain rules (e.g. minors preventing self-enrollment).
 */

import { describe, it, expect } from "vitest";
import {
  validateEnrollStep,
  initialFormData,
  type EnrollFormData,
  type WizardStep,
} from "../enroll-utils";

/** Build a valid-enough form data for a given enrollment type. */
function validForm(overrides: Partial<EnrollFormData> = {}): EnrollFormData {
  return {
    ...initialFormData,
    nombres: "Juan",
    apellidos: "Pérez",
    fechaNacimiento: "2000-01-15",
    cedula: "1712345678",
    fechaInicio: "2026-07-01",
    contactoEmergencia: "María Pérez",
    telefonoEmergencia: "0991234567",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Step: type
// ---------------------------------------------------------------------------

describe("validateEnrollStep — type step", () => {
  it("returns no errors for the type step (always valid)", () => {
    const errors = validateEnrollStep("type", validForm());
    expect(errors).toEqual([]);
  });

  it("is valid regardless of enrollment type", () => {
    expect(validateEnrollStep("type", validForm({ enrollmentType: "self" }))).toEqual([]);
    expect(validateEnrollStep("type", validForm({ enrollmentType: "child" }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Step: personal
// ---------------------------------------------------------------------------

describe("validateEnrollStep — personal step", () => {
  it("returns no errors when all required fields are filled", () => {
    const errors = validateEnrollStep("personal", validForm());
    expect(errors).toEqual([]);
  });

  it("requires nombres", () => {
    const errors = validateEnrollStep("personal", validForm({ nombres: "" }));
    expect(errors).toContain("Los nombres son obligatorios.");
  });

  it("requires nombres (whitespace only)", () => {
    const errors = validateEnrollStep("personal", validForm({ nombres: "   " }));
    expect(errors).toContain("Los nombres son obligatorios.");
  });

  it("requires apellidos", () => {
    const errors = validateEnrollStep("personal", validForm({ apellidos: "" }));
    expect(errors).toContain("Los apellidos son obligatorios.");
  });

  it("requires fechaNacimiento", () => {
    const errors = validateEnrollStep("personal", validForm({ fechaNacimiento: "" }));
    expect(errors).toContain("La fecha de nacimiento es obligatoria.");
  });

  it("requires cedula", () => {
    const errors = validateEnrollStep("personal", validForm({ cedula: "" }));
    expect(errors).toContain("La cédula de identidad es obligatoria.");
  });

  it("validates cedula has exactly 10 digits", () => {
    const errors = validateEnrollStep("personal", validForm({ cedula: "12345" }));
    expect(errors).toContain("La cédula debe tener 10 dígitos.");
  });

  it("validates cedula with non-digit characters", () => {
    const errors = validateEnrollStep("personal", validForm({ cedula: "1712abcd78" }));
    expect(errors).toContain("La cédula debe tener 10 dígitos.");
  });

  it("reports multiple errors at once", () => {
    const errors = validateEnrollStep(
      "personal",
      validForm({ nombres: "", apellidos: "", fechaNacimiento: "", cedula: "" }),
    );
    expect(errors.length).toBeGreaterThanOrEqual(4);
    expect(errors).toContain("Los nombres son obligatorios.");
    expect(errors).toContain("Los apellidos son obligatorios.");
    expect(errors).toContain("La fecha de nacimiento es obligatoria.");
    expect(errors).toContain("La cédula de identidad es obligatoria.");
  });

  // ---- Domain rule: minors cannot self-enroll ----

  it("blocks self-enrollment when birth date indicates minor age", () => {
    const errors = validateEnrollStep(
      "personal",
      validForm({
        enrollmentType: "self",
        fechaNacimiento: "2015-06-15", // 11 years old
      }),
    );
    expect(errors).toContain(
      "Los menores de edad no pueden autoinscribirse. " +
      "Seleccione 'Inscribo a un hijo / dependiente' o un " +
      "representante debe completar la inscripción.",
    );
  });

  it("allows child enrollment regardless of birth date", () => {
    const errors = validateEnrollStep(
      "personal",
      validForm({
        enrollmentType: "child",
        fechaNacimiento: "2015-06-15", // minor, but child enrollment
        nombreRepresentante: "María Rodríguez",
        cedulaRepresentante: "0998765432",
      }),
    );
    expect(errors).toEqual([]);
  });

  it("allows self-enrollment for adults", () => {
    const errors = validateEnrollStep(
      "personal",
      validForm({
        enrollmentType: "self",
        fechaNacimiento: "1990-05-20", // 36 years old
      }),
    );
    expect(errors).toEqual([]);
  });

  it("allows self-enrollment for exactly 18-year-olds", () => {
    // Birth date exactly 18 years ago from today
    const now = new Date();
    const birth = new Date(
      now.getFullYear() - 18,
      now.getMonth(),
      now.getDate(),
    );
    const iso = birth.toISOString().slice(0, 10);
    const errors = validateEnrollStep(
      "personal",
      validForm({
        enrollmentType: "self",
        fechaNacimiento: iso,
      }),
    );
    expect(errors).toEqual([]);
  });

  // ---- Representante validation for "child" enrollment ----

  it("requires nombre representante for child enrollment", () => {
    const errors = validateEnrollStep(
      "personal",
      validForm({
        enrollmentType: "child",
        nombreRepresentante: "",
      }),
    );
    expect(errors).toContain("El nombre del representante es obligatorio.");
  });

  it("requires cedula representante for child enrollment", () => {
    const errors = validateEnrollStep(
      "personal",
      validForm({
        enrollmentType: "child",
        nombreRepresentante: "María Rodríguez",
        cedulaRepresentante: "",
      }),
    );
    expect(errors).toContain("La cédula del representante es obligatoria.");
  });

  it("validates cedula representante has 10 digits for child enrollment", () => {
    const errors = validateEnrollStep(
      "personal",
      validForm({
        enrollmentType: "child",
        nombreRepresentante: "María Rodríguez",
        cedulaRepresentante: "12345",
      }),
    );
    expect(errors).toContain("La cédula del representante debe tener 10 dígitos.");
  });

  it("passes validation with valid representante data for child enrollment", () => {
    const errors = validateEnrollStep(
      "personal",
      validForm({
        enrollmentType: "child",
        nombreRepresentante: "María Rodríguez",
        cedulaRepresentante: "0998765432",
      }),
    );
    expect(errors).toEqual([]);
  });

  it("does NOT require representante fields for self enrollment", () => {
    const errors = validateEnrollStep(
      "personal",
      validForm({
        enrollmentType: "self",
        nombreRepresentante: "",
        cedulaRepresentante: "",
      }),
    );
    // Self enrollment does not require representante data
    expect(errors).not.toContain("El nombre del representante es obligatorio.");
    expect(errors).not.toContain("La cédula del representante es obligatoria.");
  });

  it("ignores malformed cedulaRepresentante for self enrollment", () => {
    const errors = validateEnrollStep(
      "personal",
      validForm({
        enrollmentType: "self",
        cedulaRepresentante: "12345",
      }),
    );
    expect(errors).not.toContain("La cédula del representante es obligatoria.");
    expect(errors).not.toContain("La cédula del representante debe tener 10 dígitos.");
  });

  it("represents absent representante with whitespace correctly", () => {
    const errors = validateEnrollStep(
      "personal",
      validForm({
        enrollmentType: "child",
        nombreRepresentante: "   ",
        cedulaRepresentante: "   ",
      }),
    );
    expect(errors).toContain("El nombre del representante es obligatorio.");
    expect(errors).toContain("La cédula del representante es obligatoria.");
  });
});

// ---------------------------------------------------------------------------
// Step: club
// ---------------------------------------------------------------------------

describe("validateEnrollStep — club step", () => {
  it("returns no errors when fechaInicio is set", () => {
    const errors = validateEnrollStep("club", validForm());
    expect(errors).toEqual([]);
  });

  it("requires fechaInicio", () => {
    const errors = validateEnrollStep("club", validForm({ fechaInicio: "" }));
    expect(errors).toContain("La fecha de inicio es obligatoria.");
  });

  it("does NOT validate nivel — trainer assigns level after enrollment", () => {
    // The form data no longer carries a nivel field. Even if an unknown
    // extra field were present, the club step only checks fechaInicio.
    const errors = validateEnrollStep("club", validForm());
    expect(errors).toEqual([]);
    // No error related to technical level should appear
    const hasNivelError = errors.some((e) =>
      /nivel|nivel t(e|é)cnico|nivel/i.test(e),
    );
    expect(hasNivelError).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Step: health
// ---------------------------------------------------------------------------

describe("validateEnrollStep — health step", () => {
  it("returns no errors when emergency contact fields are filled", () => {
    const errors = validateEnrollStep("health", validForm());
    expect(errors).toEqual([]);
  });

  it("requires contactoEmergencia", () => {
    const errors = validateEnrollStep("health", validForm({ contactoEmergencia: "" }));
    expect(errors).toContain("El nombre de contacto de emergencia es obligatorio.");
  });

  it("requires telefonoEmergencia", () => {
    const errors = validateEnrollStep("health", validForm({ telefonoEmergencia: "" }));
    expect(errors).toContain("El teléfono de emergencia es obligatorio.");
  });

  it("health fields are optional (not required)", () => {
    const errors = validateEnrollStep("health", validForm({ condicionesSalud: "", alergias: "" }));
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Step: summary
// ---------------------------------------------------------------------------

describe("validateEnrollStep — summary step", () => {
  it("always returns no errors for summary", () => {
    const errors = validateEnrollStep("summary", validForm());
    expect(errors).toEqual([]);
  });

  it("summary is valid even with empty data (review step)", () => {
    const errors = validateEnrollStep("summary", initialFormData);
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("validateEnrollStep — edge cases", () => {
  it("handles empty form data without crashing", () => {
    // Every field is empty/default
    const errors = validateEnrollStep("personal", initialFormData);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("handles cedula with only whitespace — returns required error", () => {
    const errors = validateEnrollStep("personal", validForm({ cedula: "   " }));
    expect(errors).toContain("La cédula de identidad es obligatoria.");
  });

  it("handles emergency contact with only whitespace", () => {
    const errors = validateEnrollStep("health", validForm({ contactoEmergencia: "   " }));
    expect(errors).toContain("El nombre de contacto de emergencia es obligatorio.");
  });
});
