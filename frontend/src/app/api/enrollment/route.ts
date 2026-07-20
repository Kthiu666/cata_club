import { NextResponse } from "next/server";
import { BLOOD_TYPES, type EnrollmentRequest, type EnrollmentResponse } from "@/types/enrollment";

type JsonRecord = Record<string, unknown>;

export async function POST(request: Request): Promise<NextResponse> {
  if (request.method !== "POST") {
    return NextResponse.json({ detail: "Método no permitido." }, { status: 405 });
  }
  try {
    const body: unknown = await request.json();
    if (!isEnrollmentRequest(body)) {
      return NextResponse.json({ detail: "Los datos de inscripción son inválidos o están incompletos." }, { status: 400 });
    }

    // This mock mirrors the production cookie boundary without exposing tokens
    // to client JavaScript. The backend owns real enrollment and authentication.
    const response: EnrollmentResponse = {
      enrolled: true,
    };
    const nextResponse = NextResponse.json(response, { status: 201 });
    nextResponse.cookies.set("cata-club-enrollment-mock", crypto.randomUUID(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return nextResponse;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ detail: "JSON inválido en el cuerpo de la solicitud." }, { status: 400 });
    }
    return NextResponse.json({ detail: "Error interno del servidor." }, { status: 500 });
  }
}

function isEnrollmentRequest(value: unknown): value is EnrollmentRequest {
  if (!isRecord(value) || !isStudent(value.alumno) || !isMedicalRecord(value.fichaMedica)) return false;
  const hasStudentCredentials = isCredentials(value.credencialesAlumno);
  const hasRepresentative = isRepresentative(value.representante);
  return (hasStudentCredentials && value.representante === undefined) ||
    (hasRepresentative && value.credencialesAlumno === undefined);
}

function isRepresentative(value: unknown): boolean {
  return isStudent(value) && isCredentials(value) && isNonEmptyString(value.fechaNacimiento);
}

function isStudent(value: unknown): value is JsonRecord {
  return isRecord(value) &&
    isNonEmptyString(value.nombres) &&
    isNonEmptyString(value.apellidos) &&
    isCedula(value.cedula) &&
    isDate(value.fechaNacimiento) &&
    isNonEmptyString(value.telefono);
}

function isMedicalRecord(value: unknown): boolean {
  return isRecord(value) &&
    isBloodType(value.tipoSangre) &&
    isNonEmptyString(value.contactoEmergencia) &&
    isNonEmptyString(value.telefonoEmergencia) &&
    isOptionalString(value.condicionesSalud) &&
    isOptionalString(value.alergias) &&
    isOptionalString(value.observaciones);
}

function isCredentials(value: unknown): boolean {
  return isRecord(value) && isEmail(value.correo) && isPassword(value.contrasenia);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isCedula(value: unknown): boolean {
  return typeof value === "string" && /^\d{10}$/.test(value);
}

function isDate(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isEmail(value: unknown): boolean {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPassword(value: unknown): boolean {
  return typeof value === "string" && value.length >= 8;
}

function isBloodType(value: unknown): boolean {
  return typeof value === "string" && Object.values(BLOOD_TYPES).includes(value as typeof BLOOD_TYPES[keyof typeof BLOOD_TYPES]);
}
