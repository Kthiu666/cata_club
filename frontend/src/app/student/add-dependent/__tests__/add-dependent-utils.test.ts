/**
 * Unit tests for the add-dependent wizard's pure utility functions.
 *
 * Pure functions — no React dependencies, easy to test.
 * Covers every wizard step, valid/invalid states, edge cases, and the
 * camelCase → payload assembly matching `RepresentadoCreateDTO`.
 */

import { describe, it, expect } from "vitest";
import {
  validateAddDependentStep,
  validateAddDependentForm,
  buildRepresentadoPayload,
  getAddDependentErrorMessage,
  initialAddDependentFormData,
  type AddDependentFormData,
} from "../add-dependent-utils";

/** Build a valid-enough form data, with overrides. */
function validForm(overrides: Partial<AddDependentFormData> = {}): AddDependentFormData {
  return {
    ...initialAddDependentFormData,
    nombres: "Juan",
    apellidos: "Pérez",
    fechaNacimiento: "2015-06-15",
    cedula: "1712345678",
    telefono: "0991234567",
    tipoSangre: "O_POSITIVO",
    enfermedades: "",
    alergias: "",
    contactoEmergencia: "María Pérez",
    telefonoEmergencia: "0997654321",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Step: child
// ---------------------------------------------------------------------------

describe("validateAddDependentStep — child step", () => {
  it("returns no errors when all required fields are filled", () => {
    expect(validateAddDependentStep("child", validForm())).toEqual([]);
  });

  it("requires nombres", () => {
    expect(validateAddDependentStep("child", validForm({ nombres: "" })))
      .toContain("Los nombres son obligatorios.");
  });

  it("requires nombres (whitespace only)", () => {
    expect(validateAddDependentStep("child", validForm({ nombres: "   " })))
      .toContain("Los nombres son obligatorios.");
  });

  it("requires apellidos", () => {
    expect(validateAddDependentStep("child", validForm({ apellidos: "" })))
      .toContain("Los apellidos son obligatorios.");
  });

  it("requires fechaNacimiento", () => {
    expect(validateAddDependentStep("child", validForm({ fechaNacimiento: "" })))
      .toContain("La fecha de nacimiento es obligatoria.");
  });

  it("rejects a malformed fechaNacimiento", () => {
    expect(validateAddDependentStep("child", validForm({ fechaNacimiento: "2015-13-40" })))
      .toContain("La fecha de nacimiento ingresada no es válida.");
  });

  it("rejects a fechaNacimiento in the future", () => {
    const nextYear = new Date().getFullYear() + 1;
    expect(validateAddDependentStep("child", validForm({ fechaNacimiento: `${nextYear}-01-01` })))
      .toContain("La fecha de nacimiento no puede ser en el futuro.");
  });

  it("accepts today as a valid fechaNacimiento (not future)", () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(validateAddDependentStep("child", validForm({ fechaNacimiento: iso })))
      .not.toContain("La fecha de nacimiento no puede ser en el futuro.");
  });

  it("requires cedula", () => {
    expect(validateAddDependentStep("child", validForm({ cedula: "" })))
      .toContain("La cédula de identidad es obligatoria.");
  });

  it("validates cedula has exactly 10 digits", () => {
    expect(validateAddDependentStep("child", validForm({ cedula: "12345" })))
      .toContain("La cédula debe tener 10 dígitos.");
  });

  it("validates cedula with non-digit characters", () => {
    expect(validateAddDependentStep("child", validForm({ cedula: "1712abcd78" })))
      .toContain("La cédula debe tener 10 dígitos.");
  });

  it("requires telefono", () => {
    expect(validateAddDependentStep("child", validForm({ telefono: "" })))
      .toContain("El teléfono es obligatorio.");
  });

  it("reports multiple errors at once", () => {
    const errors = validateAddDependentStep(
      "child",
      validForm({ nombres: "", apellidos: "", fechaNacimiento: "", cedula: "" }),
    );
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// Step: health
// ---------------------------------------------------------------------------

describe("validateAddDependentStep — health step", () => {
  it("returns no errors when all required fields are filled", () => {
    expect(validateAddDependentStep("health", validForm())).toEqual([]);
  });

  it("requires a valid tipoSangre", () => {
    expect(validateAddDependentStep("health", validForm({ tipoSangre: "" })))
      .toContain("El tipo de sangre es obligatorio.");
  });

  it("rejects an invalid tipoSangre value", () => {
    expect(
      validateAddDependentStep("health", validForm({ tipoSangre: "NOT_A_BLOOD_TYPE" as never })),
    ).toContain("El tipo de sangre es obligatorio.");
  });

  it("requires contactoEmergencia", () => {
    expect(validateAddDependentStep("health", validForm({ contactoEmergencia: "" })))
      .toContain("El nombre de contacto de emergencia es obligatorio.");
  });

  it("requires telefonoEmergencia", () => {
    expect(validateAddDependentStep("health", validForm({ telefonoEmergencia: "" })))
      .toContain("El teléfono de emergencia es obligatorio.");
  });

  it("enfermedades and alergias are optional", () => {
    expect(validateAddDependentStep("health", validForm({ enfermedades: "", alergias: "" })))
      .toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Step: summary
// ---------------------------------------------------------------------------

describe("validateAddDependentStep — summary step", () => {
  it("always returns no errors for summary", () => {
    expect(validateAddDependentStep("summary", validForm())).toEqual([]);
  });

  it("summary is valid even with empty data (review step)", () => {
    expect(validateAddDependentStep("summary", initialAddDependentFormData)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// validateAddDependentForm (whole-form validation)
// ---------------------------------------------------------------------------

describe("validateAddDependentForm", () => {
  it("returns no errors for a fully valid form", () => {
    expect(validateAddDependentForm(validForm())).toEqual([]);
  });

  it("combines errors from both child and health steps", () => {
    const errors = validateAddDependentForm(
      validForm({ nombres: "", tipoSangre: "" }),
    );
    expect(errors).toContain("Los nombres son obligatorios.");
    expect(errors).toContain("El tipo de sangre es obligatorio.");
  });
});

// ---------------------------------------------------------------------------
// buildRepresentadoPayload
// ---------------------------------------------------------------------------

describe("buildRepresentadoPayload", () => {
  it("builds a payload matching RepresentadoCreateDTO's camelCase shape", () => {
    const payload = buildRepresentadoPayload(validForm());
    expect(payload).toEqual({
      nombres: "Juan",
      apellidos: "Pérez",
      cedula: "1712345678",
      fechaNacimiento: "2015-06-15",
      telefono: "0991234567",
      fichaMedica: {
        tipoSangre: "O_POSITIVO",
        enfermedades: [],
        contactoEmergencia: "María Pérez",
        telefonoEmergencia: "0997654321",
      },
    });
  });

  it("trims whitespace from text fields", () => {
    const payload = buildRepresentadoPayload(
      validForm({ nombres: "  Ana  ", apellidos: "  Ruiz  ", cedula: " 1712345678 ", telefono: " 0991234567 " }),
    );
    expect(payload.nombres).toBe("Ana");
    expect(payload.apellidos).toBe("Ruiz");
    expect(payload.cedula).toBe("1712345678");
    expect(payload.telefono).toBe("0991234567");
  });

  it("parses comma-separated enfermedades into a trimmed string array", () => {
    const payload = buildRepresentadoPayload(
      validForm({ enfermedades: "Asma, Diabetes ,  , Alergia al polen" }),
    );
    expect(payload.fichaMedica?.enfermedades).toEqual(["Asma", "Diabetes", "Alergia al polen"]);
  });

  it("omits alergias/contactoEmergencia/telefonoEmergencia when blank", () => {
    const payload = buildRepresentadoPayload(
      validForm({ alergias: "", contactoEmergencia: "", telefonoEmergencia: "" }),
    );
    expect(payload.fichaMedica).not.toHaveProperty("alergias");
    expect(payload.fichaMedica).not.toHaveProperty("contactoEmergencia");
    expect(payload.fichaMedica).not.toHaveProperty("telefonoEmergencia");
  });

  it("includes alergias when present", () => {
    const payload = buildRepresentadoPayload(validForm({ alergias: "  Penicilina  " }));
    expect(payload.fichaMedica?.alergias).toBe("Penicilina");
  });
});

// ---------------------------------------------------------------------------
// getAddDependentErrorMessage
// ---------------------------------------------------------------------------

describe("getAddDependentErrorMessage", () => {
  it("maps known API status categories without returning external messages", () => {
    // 400 and 422 share one generic message: the backend returns 400 for both
    // duplicate-cédula AND unrelated validation failures (e.g. age out of
    // range), so we must not attribute a specific cause the client can't verify.
    expect(getAddDependentErrorMessage({ status: 400, message: "internal detail" }))
      .toBe("No se pudo agregar el dependiente. Revise los datos ingresados e intente nuevamente.");
    expect(getAddDependentErrorMessage({ status: 403 }))
      .toBe("No tiene permisos para agregar un dependiente.");
    expect(getAddDependentErrorMessage({ status: 422 }))
      .toBe("No se pudo agregar el dependiente. Revise los datos ingresados e intente nuevamente.");
    expect(getAddDependentErrorMessage(new Error("database secret")))
      .toBe("No se pudo agregar el dependiente. Intente nuevamente más tarde.");
  });
});
