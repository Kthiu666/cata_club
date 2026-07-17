/**
 * Student Enrollment Demo — Interactive Prototype
 *
 * Multi-step wizard for enrolling a student at Cata Club.
 * This is a frontend-only mock that demonstrates the full enrollment flow:
 *   - Enrollment type (self vs. child/dependent)
 *   - Student personal data
 *   - Birth date / age-relevant data
 *   - Club start date
 *   - Health/medical notes & emergency contact
 *   - Summary & confirmation
 *
 * No data is persisted — this is a UI prototype akin to a Figma mockup.
 * All labels and copy are in Spanish per app convention.
 */

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  User,
  UserPlus,
  Calendar,
  Heart,
  Phone,
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
  STEP_ORDER,
  STEP_LABELS,
  initialFormData,
  type EnrollFormData,
  type EnrollmentType,
  type WizardStep,
} from "./enroll-utils";

// ---------------------------------------------------------------------------
// Constants — see enroll-utils.ts for shared constants
// ---------------------------------------------------------------------------

const ACCENTED_CHARS: Record<string, string> = {
  á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n",
};

/**
 * Derives a stable, unique-enough field id from a label so <label htmlFor>
 * can be programmatically associated with its <input>/<textarea>.
 */
function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .split("")
    .map((char) => ACCENTED_CHARS[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EnrollPage(): React.ReactElement {
  const [step, setStep] = useState<WizardStep>("type");
  const [formData, setFormData] = useState<EnrollFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [summaryReviewed, setSummaryReviewed] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const confirmInFlightRef = useRef(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryAppliedRef = useRef(false);

  const currentIndex = STEP_ORDER.indexOf(step);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === STEP_ORDER.length - 1;
  const progress = ((currentIndex + 1) / STEP_ORDER.length) * 100;

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  // Support ?type=self/?type=player or ?type=child/?type=representative
  // to preselect the enrollment flow from external CTAs.
  useEffect(() => {
    if (queryAppliedRef.current) return;
    queryAppliedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    if (type === "self" || type === "player") {
      setFormData((prev) => ({ ...prev, enrollmentType: "self" }));
    } else if (type === "child" || type === "representative") {
      setFormData((prev) => ({ ...prev, enrollmentType: "child" }));
    }
  }, []);

  // ---- Helpers ----

  function clearConfirmTimeout(): void {
    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = null;
    }
  }

  function updateField<K extends keyof EnrollFormData>(
    key: K,
    value: EnrollFormData[K],
  ): void {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFormErrors([]);
  }

  function handleNext(): void {
    const errors = validateEnrollStep(step, formData);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    const nextIdx = currentIndex + 1;
    if (nextIdx < STEP_ORDER.length) {
      const nextStep = STEP_ORDER[nextIdx];
      if (nextStep === "summary") setSummaryReviewed(false);
      setStep(nextStep);
    }
  }

  function handleBack(): void {
    setFormErrors([]);
    const prevIdx = currentIndex - 1;
    if (prevIdx >= 0) {
      setStep(STEP_ORDER[prevIdx]);
    }
  }

  function handleConfirm(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (confirmInFlightRef.current || submitting || confirmed) return;
    if (step !== "summary") {
      handleNext();
      return;
    }
    if (!summaryReviewed) {
      setFormErrors(["Revise y confirme el resumen antes de finalizar la inscripción."]);
      return;
    }
    const errors = validateEnrollStep(step, formData);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    confirmInFlightRef.current = true;
    setSubmitting(true);
    // Simulate submission
    clearConfirmTimeout();
    confirmTimeoutRef.current = setTimeout(() => {
      confirmTimeoutRef.current = null;
      confirmInFlightRef.current = false;
      setSubmitting(false);
      setConfirmed(true);
    }, 1200);
  }

  function handleReset(): void {
    clearConfirmTimeout();
    setFormData(initialFormData);
    setStep("type");
    setConfirmed(false);
    setSubmitting(false);
    confirmInFlightRef.current = false;
    setSummaryReviewed(false);
    setFormErrors([]);
  }

  // ---- Demo helper — quick-fill for testing convenience ----

  function fillDemoData(type: EnrollmentType): void {
    clearConfirmTimeout();
    const base: Partial<EnrollFormData> = {
      contactoEmergencia: "Carlos Martinez",
      telefonoEmergencia: "0998765432",
    };

    switch (type) {
      case "self":
        setFormData({
          ...initialFormData,
          enrollmentType: "self",
          nombres: "Sofia",
          apellidos: "Martinez",
          fechaNacimiento: "1990-05-20",
          cedula: "1712345678",
          ...base,
        });
        break;
      case "child":
        setFormData({
          ...initialFormData,
          enrollmentType: "child",
          nombres: "Lucas",
          apellidos: "Martinez",
          fechaNacimiento: "2015-06-15",
          cedula: "1723456789",
          nombreRepresentante: "Sofia Martinez",
          cedulaRepresentante: "1712345678",
          ...base,
        });
        break;
    }
    setStep("type");
    setFormErrors([]);
    setConfirmed(false);
    setSummaryReviewed(false);
    setSubmitting(false);
    confirmInFlightRef.current = false;
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
  }): React.ReactElement {
    const fieldId = `enroll-${slugifyLabel(opts.label)}`;
    return (
      <div className="mb-4">
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-cata-text">
          {opts.label}
          {opts.required && <span className="ml-0.5 text-cata-red">*</span>}
        </label>
        <div className="relative">
          {opts.icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cata-text/65">
              {opts.icon}
            </span>
          )}
          <input
            id={fieldId}
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
  }): React.ReactElement {
    const fieldId = `enroll-${slugifyLabel(opts.label)}`;
    return (
      <div className="mb-4">
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-cata-text">
          {opts.label}
          {opts.required && <span className="ml-0.5 text-cata-red">*</span>}
          {!opts.required && (
            <span className="ml-1 text-cata-text/45">(opcional)</span>
          )}
        </label>
        <div className="relative">
          {opts.icon && (
            <span className="pointer-events-none absolute left-3.5 top-3 text-cata-text/65">
              {opts.icon}
            </span>
          )}
          <textarea
            id={fieldId}
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

  function renderTypeStep(): React.ReactElement {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-cata-text/65">
          Seleccione el tipo de inscripción que desea realizar:
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Self enrollment — Jugador */}
          <button
            type="button"
            onClick={() => updateField("enrollmentType", "self")}
            className={`rounded-xl border-2 p-5 text-left transition-all duration-200 ${
              formData.enrollmentType === "self"
                ? "border-cata-red/40 bg-cata-red/10 ring-1 ring-cata-red/20"
                : "border-cata-border bg-cata-surface hover:border-cata-red/20 hover:shadow-soft"
            }`}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cata-red/15">
              <GraduationCap size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            </div>
            <h3 className="mb-1 font-semibold text-cata-text">
              Jugador
            </h3>
            <p className="text-xs leading-relaxed text-cata-text/65">
              Quiero inscribirme yo al club. Soy mayor de edad y gestiono mi
              propia cuenta como estudiante.
            </p>
            {formData.enrollmentType === "self" && (
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cata-red">
                <CheckCircle size={12} strokeWidth={2} aria-hidden="true" />
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
                ? "border-cata-red/40 bg-cata-red/10 ring-1 ring-cata-red/20"
                : "border-cata-border bg-cata-surface hover:border-cata-red/20 hover:shadow-soft"
            }`}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Baby size={20} strokeWidth={1.5} className="text-blue-700" aria-hidden="true" />
            </div>
            <h3 className="mb-1 font-semibold text-cata-text">
              Representante
            </h3>
            <p className="text-xs leading-relaxed text-cata-text/65">
              Quiero gestionar la inscripción de un hijo/dependiente.
              El estudiante es distinto de mi cuenta.
            </p>
            {formData.enrollmentType === "child" && (
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cata-red">
                <CheckCircle size={12} strokeWidth={2} aria-hidden="true" />
                Seleccionado
              </span>
            )}
          </button>

        </div>

        {formData.enrollmentType === "child" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-900/20 p-3 text-xs text-amber-400">
            <p className="flex items-center gap-1.5 font-medium">
              <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
              Inscripción de dependiente
            </p>
            <p className="mt-1 text-amber-700/80">
              Como representante, usted será el responsable de pago de este estudiante.
              Los datos del estudiante se registrarán por separado de su cuenta.
              Complete los datos del representante para identificar al adulto
              responsable.
            </p>
          </div>
        )}

        {formData.enrollmentType === "self" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/20 p-3 text-xs text-emerald-400">
            <p className="flex items-center gap-1.5 font-medium">
              <CheckCircle size={12} strokeWidth={2} aria-hidden="true" />
              Inscripción como jugador
            </p>
            <p className="mt-1 text-emerald-700/80">
              Usted será el estudiante titular de la cuenta. No se requieren datos
              de representante.
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderPersonalStep(): React.ReactElement {
    return (
      <div className="space-y-1">
        <p className="mb-4 text-sm leading-relaxed text-cata-text/65">
          {formData.enrollmentType === "self" &&
            "Ingrese sus datos personales:"}
          {formData.enrollmentType === "child" &&
            "Ingrese los datos personales del estudiante a inscribir:"}
        </p>

        {renderInput({
          label: "Nombres",
          value: formData.nombres,
          onChange: (v) => updateField("nombres", v),
          placeholder: "p. ej. Juan Carlos",
          required: true,
          icon: <User size={16} strokeWidth={1.5} aria-hidden="true" />,
        })}

        {renderInput({
          label: "Apellidos",
          value: formData.apellidos,
          onChange: (v) => updateField("apellidos", v),
          placeholder: "p. ej. Rodríguez López",
          required: true,
          icon: <User size={16} strokeWidth={1.5} aria-hidden="true" />,
        })}

        <div className="grid gap-4 sm:grid-cols-2">
          {renderInput({
            label: "Fecha de Nacimiento",
            value: formData.fechaNacimiento,
            onChange: (v) => updateField("fechaNacimiento", v),
            type: "date",
            required: true,
            icon: <Calendar size={16} strokeWidth={1.5} aria-hidden="true" />,
          })}

          {renderInput({
            label: "Cédula de Identidad",
            value: formData.cedula,
            onChange: (v) => updateField("cedula", v),
            placeholder: "p. ej. 1712345678",
            required: true,
            icon: <Hash size={16} strokeWidth={1.5} aria-hidden="true" />,
            pattern: "[0-9]{10}",
            maxLength: 10,
            inputMode: "numeric",
          })}
        </div>

        {formData.fechaNacimiento && (() => {
          const age = calculateAge(formData.fechaNacimiento);
          const ageValid = !isNaN(age);
          return (
            <div className="rounded-xl bg-cata-bg p-3 text-xs text-cata-text/65">
              Edad calculada:{" "}
              <span className="font-medium text-cata-text">
                {ageValid ? `${age} años` : "—"}
              </span>
              {ageValid && age < 18 &&
                formData.enrollmentType === "self" && (
                  <span className="ml-1 text-amber-700">
                    — Los menores de edad requieren un representante.
                  </span>
                )}
            </div>
          );
        })()}

        {/* Representante fields — shown for child enrollment */}
        {formData.enrollmentType === "child" && (
          <>
            <div className="my-8 h-px bg-cata-border" />

            <div>
              <div className="mb-4 flex items-center gap-2">
                <UserPlus size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-cata-text">
                  Datos del Representante
                </h3>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-cata-text/65">
                Identifique al adulto responsable de pago y representante legal
                del estudiante:
              </p>

              {renderInput({
                label: "Nombres del Representante",
                value: formData.nombreRepresentante,
                onChange: (v) => updateField("nombreRepresentante", v),
                placeholder: "p. ej. María Fernanda",
                required: true,
                icon: <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />,
              })}

              {renderInput({
                label: "Cédula del Representante",
                value: formData.cedulaRepresentante,
                onChange: (v) => updateField("cedulaRepresentante", v),
                placeholder: "p. ej. 1712345678",
                required: true,
                icon: <Hash size={16} strokeWidth={1.5} aria-hidden="true" />,
                pattern: "[0-9]{10}",
                maxLength: 10,
                inputMode: "numeric",
              })}

              <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-700">
                <p className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
                  Representante mayor de edad
                </p>
                <p className="mt-1 text-purple-700/80">
                  El representante debe ser mayor de edad (18+). Al inscribir a
                  un dependiente, usted confirma que es legalmente responsable
                  del menor.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  function renderClubStep(): React.ReactElement {
    return (
      <div className="space-y-1">
        <p className="mb-4 text-sm leading-relaxed text-cata-text/65">
          Información administrativa del estudiante en Cata Club:
        </p>

        <div className="mb-4 rounded-xl border border-cata-border bg-cata-bg p-4 text-sm text-cata-text/65">
          <div className="mb-2 flex items-center gap-2">
            <GraduationCap size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <p className="font-medium text-cata-text">
              Nivel técnico pendiente de evaluación
            </p>
          </div>
          <p className="text-xs leading-relaxed text-cata-text/45">
            El estudiante no selecciona su nivel. Un entrenador lo asignará
            después de observarlo en el club.
          </p>
        </div>

        {renderInput({
          label: "Fecha de Inicio en el Club",
          value: formData.fechaInicio,
          onChange: (v) => updateField("fechaInicio", v),
          type: "date",
          required: true,
          icon: <Calendar size={16} strokeWidth={1.5} aria-hidden="true" />,
        })}

        <div className="mb-4">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-cata-text">
            <input
              type="checkbox"
              checked={formData.activo}
              onChange={(e) => updateField("activo", e.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded border-cata-border text-cata-red focus:ring-cata-red/30"
            />
            Estudiante activo desde el inicio
          </label>
          <p className="ml-6 text-xs text-cata-text/40">
            Si está marcado, el estudiante comienza a entrenar inmediatamente. Si no,
            se registrará como inactivo hasta que un administrador lo active.
          </p>
        </div>
      </div>
    );
  }

  function renderHealthStep(): React.ReactElement {
    return (
      <div className="space-y-1">
        <p className="mb-4 text-sm leading-relaxed text-cata-text/65">
          Información que el club necesita conocer para la seguridad del estudiante:
        </p>

        {renderTextarea({
          label: "Condiciones de Salud",
          value: formData.condicionesSalud,
          onChange: (v) => updateField("condicionesSalud", v),
          placeholder:
            "p. ej. Asma, diabetes, problemas cardíacos, lesiones previas...",
          icon: <Heart size={16} strokeWidth={1.5} aria-hidden="true" />,
          rows: 2,
        })}

        {renderTextarea({
          label: "Alergias",
          value: formData.alergias,
          onChange: (v) => updateField("alergias", v),
          placeholder:
            "p. ej. Alergia al polvo, al látex, a picaduras de insectos...",
          icon: <AlertTriangle size={16} strokeWidth={1.5} aria-hidden="true" />,
          rows: 2,
        })}

        <div className="my-8 h-px bg-cata-border" />

        <div className="mb-3 flex items-center gap-2">
          <Phone size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wider text-cata-text/45">
            Contacto de Emergencia
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {renderInput({
            label: "Nombre del Contacto",
            value: formData.contactoEmergencia,
            onChange: (v) => updateField("contactoEmergencia", v),
            placeholder: "p. ej. María Rodríguez",
            required: true,
            icon: <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />,
          })}

          {renderInput({
            label: "Teléfono de Emergencia",
            value: formData.telefonoEmergencia,
            onChange: (v) => updateField("telefonoEmergencia", v),
            placeholder: "p. ej. 0991234567",
            required: true,
            icon: <Phone size={16} strokeWidth={1.5} aria-hidden="true" />,
            inputMode: "tel",
          })}
        </div>

        {renderTextarea({
          label: "Observaciones Adicionales",
          value: formData.observaciones,
          onChange: (v) => updateField("observaciones", v),
          placeholder:
            "Cualquier otra información relevante que el club deba conocer...",
          icon: <FileText size={16} strokeWidth={1.5} aria-hidden="true" />,
          rows: 2,
        })}

        <div className="rounded-xl border border-amber-500/30 bg-amber-900/20 p-3 text-xs text-amber-400">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
            Demo — Sin almacenamiento real
          </p>
          <p className="mt-1 text-amber-700/80">
            Esta información se recoge únicamente para la demostración del flujo
            de inscripción. En producción, los datos médicos se manejarían de forma
            segura conforme a la normativa de protección de datos.
          </p>
        </div>
      </div>
    );
  }

  function renderSummary(): React.ReactElement {
    const age = formData.fechaNacimiento
      ? calculateAge(formData.fechaNacimiento)
      : null;
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-cata-text/65">
          Revise la información antes de confirmar la inscripción:
        </p>

        {/* Enrollment type */}
        <div className="card-hover p-4">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cata-text/45">
              Tipo de Inscripción
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {formData.enrollmentType === "self" && (
              <>
                <GraduationCap size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                <span>Jugador — El estudiante es el titular de la cuenta</span>
              </>
            )}
            {formData.enrollmentType === "child" && (
              <>
                <Baby size={16} strokeWidth={1.5} className="text-blue-700" aria-hidden="true" />
                <span>Representante — Inscripción de dependiente gestionada por un adulto</span>
              </>
            )}
          </div>
        </div>

        {/* Student data */}
        <div className="card-hover p-4">
          <div className="mb-3 flex items-center gap-2">
            <User size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cata-text/45">
              Datos del Estudiante
            </h3>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-cata-text/65">Nombres</dt>
            <dd className="font-medium text-cata-text">{formData.nombres}</dd>
            <dt className="text-cata-text/65">Apellidos</dt>
            <dd className="font-medium text-cata-text">{formData.apellidos}</dd>
            <dt className="text-cata-text/65">Fecha de Nacimiento</dt>
            <dd className="font-medium text-cata-text">
              {formData.fechaNacimiento}
              {age !== null && (
                <span className="ml-2 text-cata-text/45">({age} años)</span>
              )}
            </dd>
            <dt className="text-cata-text/65">Cédula</dt>
            <dd className="font-medium text-cata-text">{formData.cedula}</dd>
          </dl>
        </div>

        {/* Representante data — for child enrollment */}
        {formData.enrollmentType === "child" && (
          <div className="card-hover p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserPlus size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cata-text/45">
                Datos del Representante
              </h3>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-cata-text/65">Nombres</dt>
              <dd className="font-medium text-cata-text">
                {formData.nombreRepresentante || (
                  <span className="text-cata-text/45">—</span>
                )}
              </dd>
              <dt className="text-cata-text/65">Cédula</dt>
              <dd className="font-medium text-cata-text">
                {formData.cedulaRepresentante || (
                  <span className="text-cata-text/45">—</span>
                )}
              </dd>
            </dl>
          </div>
        )}

        {/* Club info */}
        <div className="card-hover p-4">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cata-text/45">
              Información del Club
            </h3>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-cata-text/65">Evaluación Técnica</dt>
            <dd className="font-medium text-cata-text">
              La asignará un entrenador después de observar al estudiante
            </dd>
            <dt className="text-cata-text/65">Fecha de Inicio</dt>
            <dd className="font-medium text-cata-text">{formData.fechaInicio}</dd>
            <dt className="text-cata-text/65">Estado</dt>
            <dd className="font-medium text-cata-text">
              {formData.activo ? "Activo" : "Inactivo"}
            </dd>
          </dl>
        </div>

        {/* Health */}
        <div className="card-hover p-4">
          <div className="mb-3 flex items-center gap-2">
            <Heart size={14} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cata-text/45">
              Salud y Emergencia
            </h3>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-cata-text/65">Condiciones de Salud</dt>
            <dd className="font-medium text-cata-text">
              {formData.condicionesSalud || (
                <span className="text-cata-text/45">Ninguna reportada</span>
              )}
            </dd>
            <dt className="text-cata-text/65">Alergias</dt>
            <dd className="font-medium text-cata-text">
              {formData.alergias || (
                <span className="text-cata-text/45">Ninguna reportada</span>
              )}
            </dd>
            <dt className="text-cata-text/65">Contacto de Emergencia</dt>
            <dd className="font-medium text-cata-text">
              {formData.contactoEmergencia}
            </dd>
            <dt className="text-cata-text/65">Teléfono de Emergencia</dt>
            <dd className="font-medium text-cata-text">
              {formData.telefonoEmergencia}
            </dd>
            {formData.observaciones && (
              <>
                <dt className="text-cata-text/65">Observaciones</dt>
                <dd className="font-medium text-cata-text">
                  {formData.observaciones}
                </dd>
              </>
            )}
          </dl>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <input
            type="checkbox"
            checked={summaryReviewed}
            onChange={(e) => {
              setSummaryReviewed(e.target.checked);
              setFormErrors([]);
            }}
            className="mt-0.5 h-4 w-4 rounded border-emerald-200 text-emerald-700 focus:ring-emerald-200"
          />
          <span>
            Revisé el resumen y confirmo que la información está correcta.
            <span className="mt-1 block text-xs text-emerald-400/75">
              Esto evita finalizar la inscripción por accidente al llegar al último paso.
            </span>
          </span>
        </label>
      </div>
    );
  }

  // ---- Render ----

  return (
    <ProtectedRoute allowedRoles={["representante", "estudiante"]}>
      {confirmed ? (
        <div className="flex min-h-[75vh] items-center justify-center py-12">
          <div className="w-full max-w-lg text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cata-state-ok/10">
              <CheckCircle size={32} className="text-cata-state-ok" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h1 className="mb-3 text-2xl font-bold tracking-tight text-cata-text">
              Inscripción Completada
            </h1>
            <p className="mb-2 text-sm leading-relaxed text-cata-text/65">
              <strong className="text-cata-text">
                {formData.nombres} {formData.apellidos}
              </strong>{" "}
              ha sido registrado como estudiante de Cata Club.
            </p>
            <p className="mb-8 text-xs leading-relaxed text-cata-text/40">
              {formData.enrollmentType === "self" &&
                "Usted es el titular de la cuenta y el estudiante."}
              {formData.enrollmentType === "child" &&
                "Usted es el representante / responsable de pago de este estudiante."}{" "}
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
          {/* Hero Banner */}
          <div className="relative mb-10 overflow-hidden rounded-3xl border border-cata-border bg-cata-surface px-6 py-10 shadow-elevated sm:px-10 sm:py-12">
            <div className="absolute inset-0 bg-logo-glow" />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
                  <UserPlus size={14} strokeWidth={2} aria-hidden="true" />
                  Inscripción
                </div>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-cata-text sm:text-4xl">
                  Inscripción de Estudiante
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-cata-text/60">
                  Complete los pasos para inscribir a un estudiante en Cata Club.
                  {formData.enrollmentType === "self" && " Inscripción como jugador."}
                  {formData.enrollmentType === "child" && " Usted actúa como representante."}
                </p>
              </div>
              <span className="hidden rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 sm:inline-block">
                Demo
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between text-xs text-cata-text/45">
              <span>
                Paso {currentIndex + 1} de {STEP_ORDER.length}
              </span>
              <span>{STEP_LABELS[step]}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-cata-border">
              <div
                className="h-full rounded-full bg-cata-red transition-all duration-400 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Demo helper — quick-fill for testing convenience (not part of production flow) */}
          <div className="mb-6 rounded-xl border border-dashed border-cata-border bg-cata-bg p-3">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle size={14} strokeWidth={1.5} className="text-amber-700" aria-hidden="true" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cata-text/45">
                Rellenar datos de prueba (solo desarrollo)
              </p>
            </div>
            <p className="mb-2 text-[10px] leading-relaxed text-cata-text/40">
              Llena los campos automáticamente pero no salta la validación — los pasos deben completarse uno por uno.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fillDemoData("self")}
                className="rounded-lg border border-cata-border bg-cata-surface px-3 py-1.5 text-xs font-medium text-cata-text transition-all hover:border-cata-red/20 hover:shadow-soft"
              >
                Jugador
              </button>
              <button
                type="button"
                onClick={() => fillDemoData("child")}
                className="rounded-lg border border-cata-border bg-cata-surface px-3 py-1.5 text-xs font-medium text-cata-text transition-all hover:border-cata-red/20 hover:shadow-soft"
              >
                Representante
              </button>
            </div>
          </div>

          {/* Form card */}
          <div className="card mx-auto max-w-2xl p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2">
              {step === "type" && <GraduationCap size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
              {step === "personal" && <User size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
              {step === "club" && <Calendar size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
              {step === "health" && <Heart size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
              {step === "summary" && <FileText size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />}
              <h2 className="text-lg font-semibold text-cata-text">
                {STEP_LABELS[step]}
              </h2>
            </div>

            <form onSubmit={handleConfirm}>
              {/* Step content */}
              {step === "type" && renderTypeStep()}
              {step === "personal" && renderPersonalStep()}
              {step === "club" && renderClubStep()}
              {step === "health" && renderHealthStep()}
              {step === "summary" && renderSummary()}

              {/* Validation errors */}
              {formErrors.length > 0 && (
                <div className="alert-error mt-4 items-start" role="alert">
                  <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <ul className="list-inside list-disc space-y-1">
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
                      disabled={submitting || !summaryReviewed}
                      className="btn-primary shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? (
                        "Inscribiendo..."
                      ) : (
                        <>
                          <CheckCircle size={14} strokeWidth={2} aria-hidden="true" />
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
          <p className="mt-6 text-center text-sm text-cata-text/65">
            <Link
              href="/student"
              className="font-medium text-cata-red transition-colors hover:text-cata-red-light"
            >
              &larr; Volver a Mi Cuenta
            </Link>
          </p>

          {/* Demo note */}
          <p className="mt-4 text-center text-xs text-cata-text/30">
            Prototipo de demostración interactivo. No se almacena ningún dato real.
            Datos ficticios para fines de presentación.
          </p>
        </div>
      )}
    </ProtectedRoute>
  );
}
