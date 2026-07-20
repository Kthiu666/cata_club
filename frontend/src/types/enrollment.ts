/** Public enrollment API contract for POST /api/v1/enrollment/. */

export const BLOOD_TYPES = {
  A_POSITIVO: "A_POSITIVO",
  A_NEGATIVO: "A_NEGATIVO",
  B_POSITIVO: "B_POSITIVO",
  B_NEGATIVO: "B_NEGATIVO",
  AB_POSITIVO: "AB_POSITIVO",
  AB_NEGATIVO: "AB_NEGATIVO",
  O_POSITIVO: "O_POSITIVO",
  O_NEGATIVO: "O_NEGATIVO",
  DESCONOCIDO: "DESCONOCIDO",
} as const;

export type BloodType = (typeof BLOOD_TYPES)[keyof typeof BLOOD_TYPES];

export interface EnrollmentStudent {
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  telefono: string;
}

export interface EnrollmentCredentials {
  correo: string;
  contrasenia: string;
}

export interface EnrollmentRepresentative extends EnrollmentStudent, EnrollmentCredentials {}

export interface EnrollmentMedicalRecord {
  tipoSangre: BloodType;
  condicionesSalud: string;
  alergias: string;
  contactoEmergencia: string;
  telefonoEmergencia: string;
  observaciones?: string;
}

export interface EnrollmentRequest {
  alumno: EnrollmentStudent;
  fichaMedica: EnrollmentMedicalRecord;
  credencialesAlumno?: EnrollmentCredentials;
  representante?: EnrollmentRepresentative;
}

export interface EnrollmentResponse {
  enrolled: true;
}
