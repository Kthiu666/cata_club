/**
 * Pure utility functions for the Student Enrollment page.
 *
 * Extracted from page.tsx for testability and to avoid Next.js page
 * export conflicts — no React dependencies.
 */

import type { FichaMedica, NivelTecnico } from "@/types/domain";

export type { NivelTecnico };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Enrollment type: self (adult student) or child/dependent. */
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
  nivel: NivelTecnico;
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
  personal: "Datos del Alumno",
  club: "Información del Club",
  health: "Salud y Emergencia",
  summary: "Resumen y Confirmación",
};

/** Technical level options for club enrollment. */
export const NIVELES: { value: NivelTecnico; label: string }[] = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

/** Default empty form data. */
export const initialFormData: EnrollFormData = {
  enrollmentType: "self",
  nombres: "",
  apellidos: "",
  fechaNacimiento: "",
  cedula: "",
  nivel: "principiante",
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
      // Always valid — both options are acceptable
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
 * Returns the age in whole years as of today.
 */
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
