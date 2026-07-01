/**
 * Student Enrollment Demo — Interactive Prototype
 *
 * Multi-step wizard for enrolling a student at Cata Club.
 * This is a frontend-only mock that demonstrates the full enrollment flow:
 *   - Enrollment type (self vs. child/dependent)
 *   - Student personal data
 *   - Birth date / age-relevant data
 *   - Technical level & start date
 *   - Health/medical notes & emergency contact
 *   - Summary & confirmation
 *
 * No data is persisted — this is a UI prototype akin to a Figma mockup.
 * All labels and copy are in Spanish per app convention.
 */

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  User,
  UserPlus,
  Calendar,
  Heart,
  Phone,
  Target,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  GraduationCap,
  Baby,
  Hash,
  FileText,
} from "lucide-react";
import {
  calculateAge,
  validateEnrollStep,
  buildFichaMedica,
  STEP_ORDER,
  STEP_LABELS,
  NIVELES,
  initialFormData,
  type NivelTecnico,
  type EnrollFormData,
  type EnrollmentType,
  type WizardStep,
} from "./enroll-utils";

// ---------------------------------------------------------------------------
// Constants — see enroll-utils.ts for shared constants
// ---------------------------------------------------------------------------

const todayStr = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EnrollPage() {
  const [step, setStep] = useState<WizardStep>("type");
  const [formData, setFormData] = useState<EnrollFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const currentIndex = STEP_ORDER.indexOf(step);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === STEP_ORDER.length - 1;
  const progress = ((currentIndex + 1) / STEP_ORDER.length) * 100;

  // ---- Helpers ----

  function updateField<K extends keyof EnrollFormData>(
    key: K,
    value: EnrollFormData[K],
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFormErrors([]);
  }

  function handleNext() {
    const errors = validateEnrollStep(step, formData);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    const nextIdx = currentIndex + 1;
    if (nextIdx < STEP_ORDER.length) {
      setStep(STEP_ORDER[nextIdx]);
    }
  }

  function handleBack() {
    setFormErrors([]);
    const prevIdx = currentIndex - 1;
    if (prevIdx >= 0) {
      setStep(STEP_ORDER[prevIdx]);
    }
  }

  function handleConfirm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors = validateEnrollStep(step, formData);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      setSubmitting(false);
      setConfirmed(true);
    }, 1200);
  }

  function handleReset() {
    setFormData(initialFormData);
    setStep("type");
    setConfirmed(false);
    setSubmitting(false);
    setFormErrors([]);
  }

  // ---- Render helpers ----

  function renderInput(opts: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
    icon?: React.ReactNode;
    pattern?: string;
    maxLength?: number;
    inputMode?: string;
    disabled?: boolean;
  }) {
    return (
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-cata-charcoal">
          {opts.label}
          {opts.required && <span className="ml-0.5 text-cata-red">*</span>}
        </label>
        <div className="relative">
          {opts.icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray">
              {opts.icon}
            </span>
          )}
          <input
            type={opts.type ?? "text"}
            value={opts.value}
            onChange={(e) => opts.onChange(e.target.value)}
            placeholder={opts.placeholder}
            required={opts.required}
            disabled={opts.disabled ?? submitting}
            pattern={opts.pattern}
            maxLength={opts.maxLength}
            inputMode={(opts.inputMode ?? "text") as React.InputHTMLAttributes<HTMLInputElement>["inputMode"]}
            className={`input-field ${opts.icon ? "pl-10" : ""}`}
          />
        </div>
      </div>
    );
  }

  function renderTextarea(opts: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    icon?: React.ReactNode;
    rows?: number;
  }) {
    return (
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-cata-charcoal">
          {opts.label}
          {opts.required && <span className="ml-0.5 text-cata-red">*</span>}
          {!opts.required && (
            <span className="ml-1 text-cata-gray-light">(opcional)</span>
          )}
        </label>
        <div className="relative">
          {opts.icon && (
            <span className="pointer-events-none absolute left-3.5 top-3 text-cata-gray">
              {opts.icon}
            </span>
          )}
          <textarea
            value={opts.value}
            onChange={(e) => opts.onChange(e.target.value)}
            placeholder={opts.placeholder}
            required={opts.required}
            disabled={submitting}
            rows={opts.rows ?? 3}
            className={`input-field ${opts.icon ? "pl-10" : ""} resize-none`}
          />
        </div>
      </div>
    );
  }

  // ---- Step renderers ----

  function renderTypeStep() {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-cata-gray">
          Seleccione el tipo de inscripción que desea realizar:
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Self enrollment */}
          <button
            type="button"
            onClick={() => updateField("enrollmentType", "self")}
            className={`rounded-xl border-2 p-5 text-left transition-all duration-200 ${
              formData.enrollmentType === "self"
                ? "border-cata-red/40 bg-cata-red/5 ring-1 ring-cata-red/20"
                : "border-cata-stone/60 bg-white hover:border-cata-stone hover:shadow-soft"
            }`}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cata-red/8">
              <GraduationCap size={20} strokeWidth={1.5} className="text-cata-red" />
            </div>
            <h3 className="mb-1 font-semibold text-cata-charcoal">
              Soy el alumno
            </h3>
            <p className="text-xs leading-relaxed text-cata-gray">
              Me inscribo a mí mismo. Soy mayor de edad y gestiono mi propia cuenta.
            </p>
            {formData.enrollmentType === "self" && (
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cata-red">
                <CheckCircle size={12} strokeWidth={2} />
                Seleccionado
              </span>
            )}
          </button>

          {/* Child / dependent enrollment */}
          <button
            type="button"
            onClick={() => updateField("enrollmentType", "child")}
            className={`rounded-xl border-2 p-5 text-left transition-all duration-200 ${
              formData.enrollmentType === "child"
                ? "border-cata-red/40 bg-cata-red/5 ring-1 ring-cata-red/20"
                : "border-cata-stone/60 bg-white hover:border-cata-stone hover:shadow-soft"
            }`}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Baby size={20} strokeWidth={1.5} className="text-blue-600" />
            </div>
            <h3 className="mb-1 font-semibold text-cata-charcoal">
              Inscribo a un hijo / dependiente
            </h3>
            <p className="text-xs leading-relaxed text-cata-gray">
              Soy representante y deseo inscribir a un menor de edad o dependiente
              a mi cargo.
            </p>
            {formData.enrollmentType === "child" && (
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cata-red">
                <CheckCircle size={12} strokeWidth={2} />
                Seleccionado
              </span>
            )}
          </button>
        </div>

        {formData.enrollmentType === "child" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            <p className="flex items-center gap-1.5 font-medium">
              <AlertTriangle size={12} strokeWidth={2} />
              Inscripción de dependiente
            </p>
            <p className="mt-1 text-amber-600/80">
              Como representante, usted será el responsable de pago de este alumno.
              Los datos del alumno se registrarán por separado de su cuenta.
            </p>
          </div>
        )}

        {formData.enrollmentType === "self" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
            <p className="flex items-center gap-1.5 font-medium">
              <CheckCircle size={12} strokeWidth={2} />
              Autoinscripción
            </p>
            <p className="mt-1 text-emerald-600/80">
              Usted será tanto el alumno como el responsable de pago
              (tipo autogestionado).
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderPersonalStep() {
    return (
      <div className="space-y-1">
        <p className="mb-4 text-sm leading-relaxed text-cata-gray">
          Ingrese los datos personales del{" "}
          {formData.enrollmentType === "child" ? "alumno a inscribir" : "alumno"}:
        </p>

        {renderInput({
          label: "Nombres",
          value: formData.nombres,
          onChange: (v) => updateField("nombres", v),
          placeholder: "p. ej. Juan Carlos",
          required: true,
          icon: <User size={16} strokeWidth={1.5} />,
        })}

        {renderInput({
          label: "Apellidos",
          value: formData.apellidos,
          onChange: (v) => updateField("apellidos", v),
          placeholder: "p. ej. Rodríguez López",
          required: true,
          icon: <User size={16} strokeWidth={1.5} />,
        })}

        <div className="grid gap-4 sm:grid-cols-2">
          {renderInput({
            label: "Fecha de Nacimiento",
            value: formData.fechaNacimiento,
            onChange: (v) => updateField("fechaNacimiento", v),
            type: "date",
            required: true,
            icon: <Calendar size={16} strokeWidth={1.5} />,
          })}

          {renderInput({
            label: "Cédula de Identidad",
            value: formData.cedula,
            onChange: (v) => updateField("cedula", v),
            placeholder: "p. ej. 1712345678",
            required: true,
            icon: <Hash size={16} strokeWidth={1.5} />,
            pattern: "[0-9]{10}",
            maxLength: 10,
            inputMode: "numeric",
          })}
        </div>

        {formData.fechaNacimiento && (
          <div className="rounded-xl bg-cata-warm p-3 text-xs text-cata-gray">
            Edad calculada:{" "}
            <span className="font-medium text-cata-charcoal">
              {calculateAge(formData.fechaNacimiento)} años
            </span>
            {calculateAge(formData.fechaNacimiento) < 18 &&
              formData.enrollmentType === "self" && (
                <span className="ml-1 text-amber-600">
                  — Los menores de edad requieren un representante.
                </span>
              )}
          </div>
        )}
      </div>
    );
  }

  function renderClubStep() {
    return (
      <div className="space-y-1">
        <p className="mb-4 text-sm leading-relaxed text-cata-gray">
          Información deportiva del alumno en Cata Club:
        </p>

        {/* Technical Level */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-cata-charcoal">
            Nivel Técnico <span className="ml-0.5 text-cata-red">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-gray">
              <Target size={16} strokeWidth={1.5} />
            </span>
            <select
              value={formData.nivel}
              onChange={(e) =>
                updateField("nivel", e.target.value as NivelTecnico)
              }
              disabled={submitting}
              className="input-field appearance-none pl-10"
            >
              {NIVELES.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1.5 text-xs text-cata-gray/50">
            El nivel puede ser ajustado posteriormente por un entrenador.
          </p>
        </div>

        {renderInput({
          label: "Fecha de Inicio en el Club",
          value: formData.fechaInicio,
          onChange: (v) => updateField("fechaInicio", v),
          type: "date",
          required: true,
          icon: <Calendar size={16} strokeWidth={1.5} />,
        })}

        <div className="mb-4">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-cata-charcoal">
            <input
              type="checkbox"
              checked={formData.activo}
              onChange={(e) => updateField("activo", e.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded border-cata-stone/70 text-cata-red focus:ring-cata-red/30"
            />
            Alumno activo desde el inicio
          </label>
          <p className="ml-6 text-xs text-cata-gray/50">
            Si está marcado, el alumno comienza a entrenar inmediatamente. Si no,
            se registrará como inactivo hasta que un administrador lo active.
          </p>
        </div>
      </div>
    );
  }

  function renderHealthStep() {
    return (
      <div className="space-y-1">
        <p className="mb-4 text-sm leading-relaxed text-cata-gray">
          Información que el club necesita conocer para la seguridad del alumno:
        </p>

        {renderTextarea({
          label: "Condiciones de Salud",
          value: formData.condicionesSalud,
          onChange: (v) => updateField("condicionesSalud", v),
          placeholder:
            "p. ej. Asma, diabetes, problemas cardíacos, lesiones previas...",
          icon: <Heart size={16} strokeWidth={1.5} />,
          rows: 2,
        })}

        {renderTextarea({
          label: "Alergias",
          value: formData.alergias,
          onChange: (v) => updateField("alergias", v),
          placeholder:
            "p. ej. Alergia al polvo, al látex, a picaduras de insectos...",
          icon: <AlertTriangle size={16} strokeWidth={1.5} />,
          rows: 2,
        })}

        <hr className="border-cata-stone/50" />

        <p className="text-xs font-semibold uppercase tracking-wider text-cata-gray-light">
          Contacto de Emergencia
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {renderInput({
            label: "Nombre del Contacto",
            value: formData.contactoEmergencia,
            onChange: (v) => updateField("contactoEmergencia", v),
            placeholder: "p. ej. María Rodríguez",
            required: true,
            icon: <UserPlus size={16} strokeWidth={1.5} />,
          })}

          {renderInput({
            label: "Teléfono de Emergencia",
            value: formData.telefonoEmergencia,
            onChange: (v) => updateField("telefonoEmergencia", v),
            placeholder: "p. ej. 0991234567",
            required: true,
            icon: <Phone size={16} strokeWidth={1.5} />,
            inputMode: "tel",
          })}
        </div>

        {renderTextarea({
          label: "Observaciones Adicionales",
          value: formData.observaciones,
          onChange: (v) => updateField("observaciones", v),
          placeholder:
            "Cualquier otra información relevante que el club deba conocer...",
          icon: <FileText size={16} strokeWidth={1.5} />,
          rows: 2,
        })}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle size={12} strokeWidth={2} />
            Demo — Sin almacenamiento real
          </p>
          <p className="mt-1 text-amber-600/80">
            Esta información se recoge únicamente para la demostración del flujo
            de inscripción. En producción, los datos médicos se manejarían de forma
            segura conforme a la normativa de protección de datos.
          </p>
        </div>
      </div>
    );
  }

  function renderSummary() {
    const age = formData.fechaNacimiento
      ? calculateAge(formData.fechaNacimiento)
      : null;
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-cata-gray">
          Revise la información antes de confirmar la inscripción:
        </p>

        {/* Enrollment type */}
        <div className="rounded-xl border border-cata-stone/50 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cata-gray-light">
            Tipo de Inscripción
          </h3>
          <div className="flex items-center gap-2 text-sm">
            {formData.enrollmentType === "self" ? (
              <>
                <GraduationCap size={16} strokeWidth={1.5} className="text-cata-red" />
                <span>Autoinscripción — El alumno es el titular de la cuenta</span>
              </>
            ) : (
              <>
                <Baby size={16} strokeWidth={1.5} className="text-blue-600" />
                <span>Inscripción de dependiente — El representante gestiona la cuenta</span>
              </>
            )}
          </div>
        </div>

        {/* Student data */}
        <div className="rounded-xl border border-cata-stone/50 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cata-gray-light">
            Datos del Alumno
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-cata-gray">Nombres</dt>
            <dd className="font-medium text-cata-charcoal">{formData.nombres}</dd>
            <dt className="text-cata-gray">Apellidos</dt>
            <dd className="font-medium text-cata-charcoal">{formData.apellidos}</dd>
            <dt className="text-cata-gray">Fecha de Nacimiento</dt>
            <dd className="font-medium text-cata-charcoal">
              {formData.fechaNacimiento}
              {age !== null && (
                <span className="ml-2 text-cata-gray-light">({age} años)</span>
              )}
            </dd>
            <dt className="text-cata-gray">Cédula</dt>
            <dd className="font-medium text-cata-charcoal">{formData.cedula}</dd>
          </dl>
        </div>

        {/* Club info */}
        <div className="rounded-xl border border-cata-stone/50 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cata-gray-light">
            Información del Club
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-cata-gray">Nivel Técnico</dt>
            <dd className="font-medium text-cata-charcoal">
              {NIVELES.find((n) => n.value === formData.nivel)?.label}
            </dd>
            <dt className="text-cata-gray">Fecha de Inicio</dt>
            <dd className="font-medium text-cata-charcoal">{formData.fechaInicio}</dd>
            <dt className="text-cata-gray">Estado</dt>
            <dd className="font-medium text-cata-charcoal">
              {formData.activo ? "Activo" : "Inactivo"}
            </dd>
          </dl>
        </div>

        {/* Health */}
        <div className="rounded-xl border border-cata-stone/50 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cata-gray-light">
            Salud y Emergencia
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-cata-gray">Condiciones de Salud</dt>
            <dd className="font-medium text-cata-charcoal">
              {formData.condicionesSalud || (
                <span className="text-cata-gray-light">Ninguna reportada</span>
              )}
            </dd>
            <dt className="text-cata-gray">Alergias</dt>
            <dd className="font-medium text-cata-charcoal">
              {formData.alergias || (
                <span className="text-cata-gray-light">Ninguna reportada</span>
              )}
            </dd>
            <dt className="text-cata-gray">Contacto de Emergencia</dt>
            <dd className="font-medium text-cata-charcoal">
              {formData.contactoEmergencia}
            </dd>
            <dt className="text-cata-gray">Teléfono de Emergencia</dt>
            <dd className="font-medium text-cata-charcoal">
              {formData.telefonoEmergencia}
            </dd>
            {formData.observaciones && (
              <>
                <dt className="text-cata-gray">Observaciones</dt>
                <dd className="font-medium text-cata-charcoal">
                  {formData.observaciones}
                </dd>
              </>
            )}
          </dl>
        </div>
      </div>
    );
  }

  // ---- Render ----

  return (
    <ProtectedRoute allowedRoles={["responsable_pago"]}>
    {confirmed ? (
      <div className="flex min-h-[75vh] items-center justify-center py-12">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle size={32} className="text-emerald-600" strokeWidth={1.5} />
          </div>
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-cata-charcoal">
            Inscripción Completada
          </h1>
          <p className="mb-2 text-sm leading-relaxed text-cata-gray">
            <strong className="text-cata-charcoal">
              {formData.nombres} {formData.apellidos}
            </strong>{" "}
            ha sido registrado como alumno de Cata Club.
          </p>
          <p className="mb-8 text-xs leading-relaxed text-cata-gray/60">
            {formData.enrollmentType === "self"
              ? "Usted es el titular de la cuenta y el alumno."
              : "Usted es el representante / responsable de pago de este alumno."}{" "}
            No se almacenó ningún dato real — esto es una demostración de IU.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/student" className="btn-primary">
              Ir a Mi Cuenta
            </Link>
            <button type="button" onClick={handleReset} className="btn-secondary">
              Nueva Inscripción
            </button>
          </div>
        </div>
      </div>
    ) : (

    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-cata-charcoal sm:text-3xl">
            Inscripción de Alumno
          </h1>
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700">
            Demo
          </span>
        </div>
        <p className="mt-1.5 text-sm text-cata-gray">
          Complete los pasos para inscribir a un alumno en Cata Club.
          {formData.enrollmentType === "child"
            ? " Usted actúa como representante."
            : " Autoinscripción como alumno autogestionado."}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-cata-gray-light">
          <span>
            Paso {currentIndex + 1} de {STEP_ORDER.length}
          </span>
          <span>{STEP_LABELS[step]}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-cata-stone/50">
          <div
            className="h-full rounded-full bg-cata-red transition-all duration-400 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Form card */}
      <div className="card mx-auto max-w-2xl p-6 sm:p-8">
        <h2 className="mb-6 text-lg font-semibold text-cata-charcoal">
          {STEP_LABELS[step]}
        </h2>

        <form onSubmit={handleConfirm}>
          {/* Step content */}
          {step === "type" && renderTypeStep()}
          {step === "personal" && renderPersonalStep()}
          {step === "club" && renderClubStep()}
          {step === "health" && renderHealthStep()}
          {step === "summary" && renderSummary()}

          {/* Validation errors */}
          {formErrors.length > 0 && (
            <div
              className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3"
              role="alert"
            >
              <ul className="list-inside list-disc space-y-1 text-xs text-cata-red">
                {formErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <div>
              {!isFirst && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={submitting}
                  className="btn-ghost"
                >
                  <ChevronLeft size={14} strokeWidth={1.5} aria-hidden="true" />
                  Atrás
                </button>
              )}
            </div>

            <div className="flex gap-3">
              {!isLast ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary shadow-soft"
                >
                  Siguiente
                  <ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary shadow-soft"
                >
                  {submitting ? (
                    "Inscribiendo..."
                  ) : (
                    <>
                      <CheckCircle size={14} strokeWidth={2} />
                      Confirmar Inscripción
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Navigation link */}
      <p className="mt-6 text-center text-sm text-cata-gray">
        <Link
          href="/student"
          className="font-medium text-cata-red transition-colors hover:text-cata-red-light"
        >
          &larr; Volver a Mi Cuenta
        </Link>
      </p>

      {/* Demo note */}
      <p className="mt-4 text-center text-xs text-cata-gray/40">
        Prototipo de demostración interactivo. No se almacena ningún dato real.
        Datos ficticios para fines de presentación.
      </p>
    </div>
    )}
    </ProtectedRoute>
  );
}


