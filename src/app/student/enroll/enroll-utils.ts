/**
 * Pure utility functions for the Student Enrollment page.
 *
 * Extracted from page.tsx for testability and to avoid Next.js page
 * export conflicts — no React dependencies.
 */

import type { FichaMedica } from "@/types/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Enrollment type:
 * - "self"    → Jugador: the user enrolls themselves as a student.
 * - "child"   → Representante: the user enrolls a child/dependent only.
 */
export type EnrollmentType = "self" | "child";

/** Wizard step identifiers. */
export type WizardStep = "type" | "personal" | "club" | "health" | "summary";

/** Shape of the enrollment form data. */
export interface EnrollFormData {
  enrollmentType: EnrollmentType;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  cedula: string;
  // Representante fields — used when enrollmentType is "child".
  // nombreRepresentante/cedulaRepresentante identify the _existing_ adult
  // responsible for the child.
  nombreRepresentante: string;
  cedulaRepresentante: string;
  fechaInicio: string;
  activo: boolean;
  condicionesSalud: string;
  alergias: string;
  contactoEmergencia: string;
  telefonoEmergencia: string;
  observaciones: string;
}

/** Step order used by the wizard. */
export const STEP_ORDER: WizardStep[] = [
  "type",
  "personal",
  "club",
  "health",
  "summary",
];

/** Human-readable labels for each step, in Spanish. */
export const STEP_LABELS: Record<WizardStep, string> = {
  type: "Tipo de Inscripción",
  personal: "Datos del Estudiante",
  club: "Información del Club",
  health: "Salud y Emergencia",
  summary: "Resumen y Confirmación",
};

/** Default empty form data. */
export const initialFormData: EnrollFormData = {
  enrollmentType: "self",
  nombres: "",
  apellidos: "",
  fechaNacimiento: "",
  cedula: "",
  nombreRepresentante: "",
  cedulaRepresentante: "",
  fechaInicio: new Date().toISOString().slice(0, 10),
  activo: true,
  condicionesSalud: "",
  alergias: "",
  contactoEmergencia: "",
  telefonoEmergencia: "",
  observaciones: "",
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a wizard step's form data and return error messages.
 *
 * Pure function — no React dependencies, fully testable.
 *
 * @param step — The current wizard step identifier.
 * @param data — The current enrollment form data.
 * @returns A list of error message strings (empty = valid).
 */
export function validateEnrollStep(
  step: WizardStep,
  data: EnrollFormData,
): string[] {
  const errors: string[] = [];
  switch (step) {
    case "type":
      // Always valid — player and representative options are acceptable.
      break;
    case "personal":
      if (!data.nombres.trim()) errors.push("Los nombres son obligatorios.");
      if (!data.apellidos.trim()) errors.push("Los apellidos son obligatorios.");
      if (!data.fechaNacimiento) errors.push("La fecha de nacimiento es obligatoria.");
      if (!data.cedula.trim()) {
        errors.push("La cédula de identidad es obligatoria.");
      } else if (!/^\d{10}$/.test(data.cedula)) {
        errors.push("La cédula debe tener 10 dígitos.");
      }
      // Invalid birth date — unparseable even if non-empty
      if (data.fechaNacimiento && isNaN(calculateAge(data.fechaNacimiento))) {
        errors.push("La fecha de nacimiento ingresada no es válida.");
      }

      // Domain rule: minors cannot self-enroll
      if (data.enrollmentType === "self" && data.fechaNacimiento) {
        const age = calculateAge(data.fechaNacimiento);
        if (age < 18) {
          errors.push(
            "Los menores de edad no pueden autoinscribirse. " +
            "Seleccione 'Inscribo a un hijo / dependiente' o un " +
            "representante debe completar la inscripción.",
          );
        }
      }

      // Representante name is required when someone else is the student
      if (
        data.enrollmentType === "child" &&
        !data.nombreRepresentante.trim()
      ) {
        errors.push("El nombre del representante es obligatorio.");
      }

      // Representante ID is required for child enrollment
      if (
        data.enrollmentType === "child" &&
        !data.cedulaRepresentante.trim()
      ) {
        errors.push("La cédula del representante es obligatoria.");
      } else if (
        data.enrollmentType === "child" &&
        !/^\d{10}$/.test(data.cedulaRepresentante)
      ) {
        errors.push("La cédula del representante debe tener 10 dígitos.");
      }
      break;
    case "club":
      if (!data.fechaInicio) errors.push("La fecha de inicio es obligatoria.");
      break;
    case "health":
      if (!data.contactoEmergencia.trim())
        errors.push("El nombre de contacto de emergencia es obligatorio.");
      if (!data.telefonoEmergencia.trim())
        errors.push("El teléfono de emergencia es obligatorio.");
      break;
    case "summary":
      break;
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Domain helpers
// ---------------------------------------------------------------------------

/**
 * Build an empty FichaMedica from the health fields of EnrollFormData.
 */
export function buildFichaMedica(data: EnrollFormData): FichaMedica {
  return {
    condicionesSalud: data.condicionesSalud,
    alergias: data.alergias,
    contactoEmergencia: data.contactoEmergencia,
    telefonoEmergencia: data.telefonoEmergencia,
    observaciones: data.observaciones || undefined,
  };
}

// ---------------------------------------------------------------------------
// Age calculation
// ---------------------------------------------------------------------------

/**
 * Calculate age from an ISO date string (YYYY-MM-DD).
 *
 * Parses the date-string component-wise (year, month, day) to avoid the
 * UTC-midnight interpretation of `new Date("YYYY-MM-DD")`, which shifts
 * the date backward in negative-UTC-offset timezones such as Ecuador
 * (UTC-5). Using calendar-component parsing keeps the comparison in local
 * time, ensuring boundary cases like "birthday is tomorrow" are correct.
 *
 * Accepts an optional `today` parameter (defaults to `new Date()`) so that
 * tests can pass a fixed reference date for deterministic results.
 *
 * @param birthDate — ISO date string "YYYY-MM-DD".
 * @param today — Reference date (default `new Date()`).
 * @returns Age in whole years, or `NaN` for invalid/empty/unparseable input.
 */
export function calculateAge(
  birthDate: string,
  today: Date = new Date(),
): number {
  if (!birthDate) return NaN;

  const parts = birthDate.split("-");
  if (parts.length !== 3) return NaN;

  const [birthYear, birthMonth, birthDay] = parts.map(Number);

  if (
    !Number.isInteger(birthYear) ||
    !Number.isInteger(birthMonth) ||
    !Number.isInteger(birthDay) ||
    birthYear < 1900 ||
    birthYear > 2200 ||
    birthMonth < 1 ||
    birthMonth > 12 ||
    birthDay < 1 ||
    birthDay > 31
  ) {
    return NaN;
  }

  // Calendar validation: reject dates like Feb 31 or Apr 31 that JS
  // silently "overflows" into the next valid calendar date.
  const parsed = new Date(birthYear, birthMonth - 1, birthDay);
  if (
    parsed.getFullYear() !== birthYear ||
    parsed.getMonth() !== birthMonth - 1 ||
    parsed.getDate() !== birthDay
  ) {
    return NaN;
  }

  let age = today.getFullYear() - birthYear;
  const monthDiff = today.getMonth() - (birthMonth - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
    age--;
  }
  return age;
}
