"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  Heart,
  Building2,
  Hash,
  ChevronDown,
  CheckCircle,
} from "lucide-react";

// Domain values from Cata Club class diagram
const ROLES = [
  { value: "ALUMNO", label: "Alumno" },
  { value: "ENTRENADOR", label: "Entrenador" },
  { value: "ADMINISTRADOR", label: "Administrador" },
] as const;

const INSTITUTION_TYPES = [
  { value: "", label: "Seleccione el tipo de institución..." },
  { value: "PARTICULAR", label: "Particular" },
  { value: "FISCAL", label: "Fiscal" },
  { value: "FISCOMISIONAL", label: "Fiscomisional" },
  { value: "MUNICIPAL", label: "Municipal" },
] as const;

export default function RegisterPage() {
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState("ALUMNO");
  const [formError, setFormError] = useState<string | null>(null);
  const [demoSuccess, setDemoSuccess] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    // Demo mode: simulate processing then show success state
    setTimeout(() => {
      setSubmitting(false);
      setDemoSuccess(true);
    }, 1500);
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-10 text-center">
          <div className="relative mx-auto mb-5 h-20 w-20 overflow-hidden rounded-2xl shadow-soft">
            <Image
              src="/brand/cata-club-logo.jpeg"
              alt="Cata Club"
              fill
              className="object-cover"
              sizes="80px"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-cata-charcoal">
            Crear su cuenta
          </h1>
          <p className="mt-1.5 text-sm text-cata-gray">
            Regístrese en Cata Club Admin
          </p>
        </div>

        {/* Form card */}
        <div className="card p-8 sm:p-9">
          {demoSuccess ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle
                  size={28}
                  className="text-green-600"
                  aria-hidden="true"
                />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-cata-charcoal">
                Registro de Demostración Completado
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-cata-gray">
                No se almacenó ningún dato. Esto es una demostración de IU — cuando el
                backend esté conectado, se crearía su cuenta.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={() => {
                    setDemoSuccess(false);
                    setFormError(null);
                  }}
                  className="btn-primary"
                >
                  Editar información
                </button>
                <Link href="/login" className="btn-secondary text-center">
                  Ir a Iniciar Sesión
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* -- Account -- */}
              <fieldset>
                <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-cata-gray-light">
                  Cuenta
                </legend>

                {/* Role */}
                <div className="mb-4">
                  <label
                    htmlFor="role"
                    className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                  >
                    Tipo de Perfil
                  </label>
                  <div className="relative">
                    <select
                      id="role"
                      name="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={submitting}
                      className="input-field appearance-none pr-10"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                  >
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                      aria-hidden="true"
                    />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="correo@ejemplo.com"
                      required
                      disabled={submitting}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="mb-4">
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                      aria-hidden="true"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Cree una contraseña"
                      required
                      minLength={8}
                      disabled={submitting}
                      className="input-field pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cata-gray hover:text-cata-charcoal"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? (
                        <EyeOff size={16} strokeWidth={1.5} aria-hidden="true" />
                      ) : (
                        <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                  >
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                      aria-hidden="true"
                    />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder="Vuelva a ingresar la contraseña"
                      required
                      disabled={submitting}
                      className="input-field pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cata-gray hover:text-cata-charcoal"
                      aria-label={
                        showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} strokeWidth={1.5} aria-hidden="true" />
                      ) : (
                        <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </fieldset>

              {/* -- Personal Information -- */}
              <hr className="border-cata-stone/50" />
              <fieldset>
                <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-cata-gray-light">
                  Información Personal
                </legend>

                {/* First Names */}
                <div className="mb-4">
                  <label
                    htmlFor="firstName"
                    className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                  >
                    Nombres
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      placeholder="p. ej. Juan Carlos"
                      required
                      disabled={submitting}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Last Names */}
                <div className="mb-4">
                  <label
                    htmlFor="lastName"
                    className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                  >
                    Apellidos
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      placeholder="p. ej. Rodríguez López"
                      required
                      disabled={submitting}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* National ID */}
                <div className="mb-4">
                  <label
                    htmlFor="nationalId"
                    className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                  >
                    Cédula de Identidad
                  </label>
                  <div className="relative">
                    <Hash
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      id="nationalId"
                      name="nationalId"
                      placeholder="p. ej. 1712345678"
                      required
                      disabled={submitting}
                      pattern="[0-9]{10}"
                      maxLength={10}
                      inputMode="numeric"
                      title="Cédula ecuatoriana: 10 dígitos (p. ej. 1712345678)"
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Birth Date */}
                <div className="mb-4">
                  <label
                    htmlFor="birthDate"
                    className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                  >
                    Fecha de Nacimiento
                  </label>
                  <div className="relative">
                    <Calendar
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                      aria-hidden="true"
                    />
                    <input
                      type="date"
                      id="birthDate"
                      name="birthDate"
                      required
                      disabled={submitting}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="mb-4">
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                  >
                    Teléfono Celular
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                      aria-hidden="true"
                    />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      placeholder="p. ej. 0991234567"
                      required
                      disabled={submitting}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div>
                  <label
                    htmlFor="contactPhone"
                    className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                  >
                    Teléfono de Contacto{" "}
                    <span className="text-cata-gray-light">(opcional)</span>
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                      aria-hidden="true"
                    />
                    <input
                      type="tel"
                      id="contactPhone"
                      name="contactPhone"
                      placeholder="p. ej. 022345678"
                      disabled={submitting}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
              </fieldset>

              {/* -- Club Context -- */}

              {/*
                NOTE — Technical Level (Beginner / Intermediate / Advanced) is
                intentionally NOT collected during registration. Technical level
                is assigned later by a trainer or admin after evaluating the
                student, following the Cata Club domain model. Do NOT re-add
                this field to the registration form.
              */}

              <hr className="border-cata-stone/50" />
              <fieldset>
                <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-cata-gray-light">
                  Contexto del Club
                </legend>

                {/* Institution Name */}
                <div className="mb-4">
                  <label
                    htmlFor="institution"
                    className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                  >
                    Institución Educativa
                  </label>
                  <div className="relative">
                    <Building2
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      id="institution"
                      name="institution"
                      placeholder="p. ej. Colegio Nacional"
                      required
                      disabled={submitting}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Institution Type */}
                <div>
                  <label
                    htmlFor="institutionType"
                    className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                  >
                    Tipo de Institución
                  </label>
                  <div className="relative">
                    <select
                      id="institutionType"
                      name="institutionType"
                      defaultValue=""
                      disabled={submitting}
                      className="input-field appearance-none pr-10"
                    >
                      {INSTITUTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-cata-gray"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* Demo note: Technical Level is intentionally absent */}
                <p className="mt-4 rounded-xl bg-cata-warm p-3 text-xs leading-relaxed text-cata-gray/60">
                  <strong>Nota:</strong> El nivel técnico (Principiante / Intermedio /
                  Avanzado) no se recoge durante el registro. Será asignado
                  posteriormente por un entrenador o administrador tras evaluar al estudiante.
                </p>
              </fieldset>

              {/* -- Medical Information -- */}
              <hr className="border-cata-stone/50" />
              <fieldset>
                <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-cata-gray-light">
                  Información Médica
                </legend>

                <div>
                  <label
                    htmlFor="medicalNotes"
                    className="mb-1.5 block text-sm font-medium text-cata-charcoal"
                  >
                    Condiciones de Salud{" "}
                    <span className="text-cata-gray-light">(opcional)</span>
                  </label>
                  <div className="relative">
                    <Heart
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-3 text-cata-gray"
                      aria-hidden="true"
                    />
                    <textarea
                      id="medicalNotes"
                      name="medicalNotes"
                      rows={3}
                      placeholder="p. ej. Asma, alergias, lesiones u otra información relevante sobre su salud..."
                      disabled={submitting}
                      className="input-field pl-10 resize-none"
                    />
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-cata-gray/50">
                    Esto es una demostración — no se recoge ni almacena información médica real. En un
                    despliegue de producción, la información de salud se manejaría de forma segura
                    de acuerdo con la normativa aplicable de protección de datos.
                  </p>
                </div>
              </fieldset>

              {/* Validation error */}
              {formError && (
                <p className="text-sm text-red-600" role="alert">
                  {formError}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary mt-2 w-full shadow-soft"
              >
                {submitting ? "Creando cuenta..." : "Crear Cuenta"}
              </button>
            </form>
          )}
        </div>

        {/* Sign in link */}
        <p className="mt-8 text-center text-sm text-cata-gray">
          ¿Ya tiene una cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-cata-red transition-colors hover:text-cata-red-light"
          >
            Iniciar sesión
          </Link>
        </p>

        {/* Demo mode note */}
        <p className="mt-6 text-center text-xs text-cata-gray/40">
          La interfaz de registro es un placeholder de demostración. No se envía ni almacena
          ningún dato. La creación de cuentas se habilitará cuando el servicio de autenticación
          del backend esté conectado.
        </p>
      </div>
    </div>
  );
}
