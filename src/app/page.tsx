import Link from "next/link";
import Image from "next/image";
import {
  Users,
  ShieldCheck,
  CalendarDays,
  LayoutDashboard,
  LogIn,
  GraduationCap,
  UserCircle,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Gestión de Membresías",
    description:
      "Administre estudiantes, representantes y perfiles de membresía con operaciones CRUD completas y búsqueda.",
  },
  {
    icon: ShieldCheck,
    title: "Validación de Pagos",
    description:
      "Valide comprobantes de pago de membresías, realice seguimiento del estado de los miembros y mantenga una traza de auditoría clara para cada transacción.",
  },
  {
    icon: CalendarDays,
    title: "Horarios y Asistencia",
    description:
      "Organice sesiones de entrenamiento de tenis de mesa, asigne estudiantes por nivel técnico y registre la asistencia en todas las sesiones.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="flex w-full flex-col items-center py-20 text-center sm:py-28 bg-logo-glow">
        {/* Real logo as central brand asset */}
        <div className="relative mb-8 h-28 w-28 overflow-hidden rounded-2xl shadow-elevated sm:h-36 sm:w-36">
          <Image
            src="/brand/cata-club-logo.jpeg"
            alt="Cata Club"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 112px, 144px"
            priority
          />
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight text-cata-charcoal sm:text-5xl lg:text-6xl">
          Cata Club
        </h1>
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-cata-red/80">
          Tenis de Mesa
        </p>
        <p className="mb-8 max-w-xl text-lg leading-relaxed text-cata-gray">
          Sistema de administración del club de tenis de mesa. Gestión de membresías,
          validación de pagos y control de asistencia a entrenamientos, todo en un solo lugar.
        </p>
        <p className="mb-12 text-sm text-cata-gray/40">
          Proyecto universitario de software &mdash; Pareja 3
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/dashboard" className="btn-primary shadow-soft">
            <LayoutDashboard size={16} strokeWidth={2} aria-hidden="true" />
            Panel de Control
          </Link>
          <Link href="/login" className="btn-secondary shadow-soft">
            <LogIn size={16} strokeWidth={2} aria-hidden="true" />
            Iniciar Sesión
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mb-20 grid w-full gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="card-hover flex flex-col items-start p-6 sm:p-7"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-cata-red/8">
              <feature.icon
                size={20}
                strokeWidth={1.5}
                className="text-cata-red"
                aria-hidden="true"
              />
            </div>
            <h2 className="mb-2 text-base font-semibold text-cata-charcoal">
              {feature.title}
            </h2>
            <p className="text-sm leading-relaxed text-cata-gray">
              {feature.description}
            </p>
          </div>
        ))}
      </section>

      {/* Portales de demostración por rol */}
      <section className="mb-20 w-full">
        <h2 className="mb-6 text-center text-lg font-semibold text-cata-charcoal">
          Portales de Demostración
        </h2>
        <p className="mb-8 text-center text-sm text-cata-gray">
          Explore la experiencia Cata Club desde diferentes perspectivas — todo con
          datos de demostración locales, sin necesidad de inicio de sesión.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            href="/trainer"
            className="card-hover group flex items-start gap-5 p-6 sm:p-7"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cata-red/8">
              <GraduationCap
                size={22}
                strokeWidth={1.5}
                className="text-cata-red"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-base font-semibold text-cata-charcoal">
                Panel del Entrenador
              </h3>
              <p className="text-sm leading-relaxed text-cata-gray">
                Sesiones del día, lista de estudiantes con registro de asistencia
                y alertas de salud y seguridad.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cata-red">
                Ver Demo de Entrenador
                <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </span>
            </div>
          </Link>
          <Link
            href="/student"
            className="card-hover group flex items-start gap-5 p-6 sm:p-7"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cata-red/8">
              <UserCircle
                size={22}
                strokeWidth={1.5}
                className="text-cata-red"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-base font-semibold text-cata-charcoal">
                Portal del Estudiante
              </h3>
              <p className="text-sm leading-relaxed text-cata-gray">
                Estado de membresía y pagos, horario de entrenamiento y
                carga de comprobantes.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cata-red">
                Ver Demo de Estudiante
                <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Estado del proyecto */}
      <div className="mb-20 w-full rounded-2xl border border-cata-stone/50 bg-white p-6">
        <p className="text-center text-xs leading-relaxed text-cata-gray">
          <span className="font-medium text-cata-charcoal">Demo Frontend</span>
          &nbsp;&mdash; actualmente funcionando con datos mock locales. Listo para
          integración con backend mediante{" "}
          <code className="rounded bg-cata-warm px-1.5 py-0.5 font-mono text-xs">
            NEXT_PUBLIC_USE_MOCKS=false
          </code>
          .
        </p>
      </div>
    </div>
  );
}
