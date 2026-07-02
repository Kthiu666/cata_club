import Link from "next/link";
import Image from "next/image";
import {
  Users,
  ShieldCheck,
  CalendarDays,
  LogIn,
  BarChart3,
  Medal,
  Clock,
  CheckCircle,
} from "lucide-react";

// ── Data ────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Users,
    title: "Gestión de Membresías",
    description:
      "Administre estudiantes, responsables de pago y perfiles de membresía con operaciones CRUD completas y búsqueda avanzada.",
  },
  {
    icon: ShieldCheck,
    title: "Validación de Pagos",
    description:
      "Valide comprobantes de pago, active membresías y mantenga una traza de auditoría clara para cada transacción del club.",
  },
  {
    icon: CalendarDays,
    title: "Horarios y Asistencia",
    description:
      "Organice sesiones de entrenamiento, agrupe estudiantes por nivel técnico y registre la asistencia en todas las sesiones.",
  },
];

const stats = [
  { value: "100+", label: "Miembros activos", icon: Users },
  { value: "15+", label: "Entrenadores", icon: Medal },
  { value: "98%", label: "Asistencia promedio", icon: BarChart3 },
  { value: "24/7", label: "Disponible en línea", icon: Clock },
];

const steps = [
  {
    number: "01",
    title: "Registre miembros",
    description:
      "Dé de alta estudiantes y responsables de pago con perfiles completos. Cada miembro queda vinculado a su plan de membresía.",
  },
  {
    number: "02",
    title: "Gestione pagos",
    description:
      "Revise comprobantes, valide pagos y active membresías al instante. Todo el historial financiero del club en un panel.",
  },
  {
    number: "03",
    title: "Controle asistencia",
    description:
      "Tome asistencia por sesión, visualice el historial por miembro y mantenga el control de participación del club.",
  },
];

// ── Hero Visual — Logo + abstract court geometry + status chips ─────────

function HeroVisualCard() {
  return (
    <div className="relative w-full max-w-md lg:max-w-none mx-auto">
      {/* Card backdrop glow */}
      <div
        className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-cata-red/10 via-transparent to-transparent blur-2xl -z-10"
        aria-hidden="true"
      />

      <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8 shadow-elevated backdrop-blur-sm pointer-events-none">
        {/* Logo */}
        <div className="relative mx-auto mb-6 h-24 w-24 overflow-hidden rounded-2xl ring-2 ring-white/10 shadow-elevated">
          <Image
            src="/brand/cata-club-logo.jpeg"
            alt=""
            role="presentation"
            fill
            className="object-cover"
            sizes="96px"
            priority
          />
        </div>

        {/* Abstract court geometry — minimal, elegant */}
        <svg
          viewBox="0 0 240 110"
          className="w-full"
          aria-hidden="true"
        >
          {/* Outer court */}
          <rect
            x="18"
            y="8"
            width="204"
            height="94"
            rx="6"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
          {/* Center line (dashed) */}
          <line
            x1="120"
            y1="8"
            x2="120"
            y2="102"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          {/* Cross line */}
          <line
            x1="18"
            y1="55"
            x2="222"
            y2="55"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          {/* Ball trajectory arc (decorative) */}
          <path
            d="M 40 75 Q 120 20 200 75"
            fill="none"
            stroke="rgba(139,26,26,0.35)"
            strokeWidth="1"
          />
          {/* Ball position */}
          <circle
            cx="120"
            cy="44"
            r="2.5"
            fill="rgba(139,26,26,0.45)"
          />
          {/* Decorative dots */}
          <circle cx="40" cy="25" r="1.5" fill="rgba(255,255,255,0.06)" />
          <circle cx="200" cy="88" r="1.5" fill="rgba(255,255,255,0.06)" />
          <circle cx="60" cy="92" r="1" fill="rgba(255,255,255,0.04)" />
        </svg>

        {/* Status chips */}
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/45">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
            Demo activo
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/40">
            Gestión integral
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/40">
            v1.0
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          HERO — Full-width brand splash
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative -mx-4 sm:-mx-8 lg:-mx-12 overflow-hidden bg-gradient-to-b from-cata-navy via-cata-navy to-[#16162a]">
        {/* Ambient glow layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_40%,rgba(139,26,26,0.15)_0%,transparent_65%)]" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-cata-red/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-cata-red/5 blur-[100px]" />
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative mx-auto max-w-8xl px-4 sm:px-8 lg:px-12 py-16 sm:py-24 lg:py-28">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* ── Text block ── */}
            <div className="flex-1 text-center lg:text-left">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-cata-red/60">
                Tenis de Mesa
              </p>
              <h1 className="mb-4 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                Cata Club
              </h1>
              <p className="mb-8 max-w-xl text-base sm:text-lg leading-relaxed text-white/55 mx-auto lg:mx-0">
                El sistema integral para la gestión de tu club de tenis de mesa.
                Membresías, pagos y control de asistencia, todo en un solo
                lugar, accesible desde cualquier dispositivo.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2.5 rounded-xl bg-cata-red px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-cata-red-light hover:shadow-lg hover:shadow-cata-red/25 focus:outline-none focus:ring-2 focus:ring-cata-red/50 active:scale-[0.98]"
                >
                  <LogIn size={16} strokeWidth={2} aria-hidden="true" />
                  Ingresar al sistema
                </Link>
                <Link
                  href="#funciones"
                  className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/10 hover:border-white/25 hover:text-white/90 focus:outline-none focus:ring-2 focus:ring-white/30 active:scale-[0.98]"
                >
                  Conocer más
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 3l5 5-5 5" />
                  </svg>
                </Link>
              </div>

              {/* Trait chips */}
              <div className="mt-10 flex flex-wrap justify-center lg:justify-start gap-3">
                {["Gestión de miembros", "Pagos en línea", "Asistencia digital"].map(
                  (trait) => (
                    <span
                      key={trait}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/40"
                    >
                      <span className="h-1 w-1 rounded-full bg-cata-red/50" />
                      {trait}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* ── Premium visual card ── */}
            <div className="flex-1 w-full">
              <HeroVisualCard />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          STATS BAR
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-14 -mx-4 sm:-mx-8 lg:-mx-12 bg-cata-warm/50 border-y border-cata-stone/40">
        <div className="mx-auto max-w-8xl px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cata-red/8">
                    <Icon
                      size={18}
                      strokeWidth={1.5}
                      className="text-cata-red"
                      aria-hidden="true"
                    />
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-cata-charcoal">
                    {stat.value}
                  </span>
                  <span className="text-xs text-cata-gray">{stat.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-4 text-center text-xs tracking-wide text-cata-gray">
          * Valores ilustrativos — demo con datos mock locales.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CAPABILITIES
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="funciones" className="scroll-mt-20 py-20">
        <div className="text-center mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cata-red/60">
            Funcionalidades
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-cata-charcoal">
            Todo lo que tu club necesita
          </h2>
          <p className="mt-3 max-w-lg mx-auto text-sm leading-relaxed text-cata-gray">
            Una plataforma moderna para centralizar la administración de tu club
            de tenis de mesa, desde el registro hasta el control de asistencia.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="card-hover flex flex-col items-start p-6 sm:p-7"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cata-red/8">
                  <Icon
                    size={20}
                    strokeWidth={1.5}
                    className="text-cata-red"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mb-2 text-base font-semibold text-cata-charcoal">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-cata-gray">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HOW IT WORKS
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 -mx-4 sm:-mx-8 lg:-mx-12 bg-white border-y border-cata-stone/40">
        <div className="mx-auto max-w-8xl px-4 sm:px-8 lg:px-12">
          <div className="text-center mb-14">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cata-red/60">
              Cómo funciona
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-cata-charcoal">
              Tres pasos para gestionar tu club
            </h2>
          </div>

          <div className="relative grid gap-8 sm:grid-cols-3">
            {/* Connector line (desktop only) */}
            <div
              className="hidden sm:block absolute top-12 left-[calc(16.66%+1.5rem)] right-[calc(16.66%+1.5rem)] h-px bg-gradient-to-r from-cata-stone/60 via-cata-red/30 to-cata-stone/60"
              aria-hidden="true"
            />

            {steps.map((step) => (
              <div
                key={step.number}
                className="relative flex flex-col items-center text-center"
              >
                {/* Number circle */}
                <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-cata-red text-sm font-bold text-white shadow-md">
                  {step.number}
                  <div className="absolute inset-0 rounded-full border border-white/20" />
                </div>

                {/* Step card */}
                <div className="w-full rounded-2xl border border-cata-stone/50 bg-cata-cream/60 p-6 shadow-soft">
                  <h3 className="mb-2.5 text-base font-semibold text-cata-charcoal">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-cata-gray">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-24">
        <div className="relative mx-auto max-w-2xl text-center">
          {/* Decorative glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-cata-red/5 blur-[80px] pointer-events-none" />

          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-cata-charcoal mb-4">
              ¿Listo para digitalizar tu club?
            </h2>
            <p className="text-sm leading-relaxed text-cata-gray mb-8 max-w-md mx-auto">
              Accede al sistema de administración de Cata Club y lleva el
              control de membresías, pagos y asistencia a un nuevo nivel.
            </p>
            <Link
              href="/login"
              className="btn-primary shadow-soft inline-flex items-center gap-2.5 px-7 py-3 text-sm"
            >
              <LogIn size={16} strokeWidth={2} aria-hidden="true" />
              Ingresar al sistema
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          STATUS NOTE
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="mb-20 w-full rounded-2xl border border-cata-stone/50 bg-white p-6">
        <p className="text-center text-xs leading-relaxed text-cata-gray">
          <span className="font-medium text-cata-charcoal">
            Demo — Cata Club
          </span>
          &nbsp;&mdash; frontend de demostración con datos mock locales.
          Listo para integración con backend mediante{" "}
          <code className="rounded bg-cata-warm px-1.5 py-0.5 font-mono text-xs">
            NEXT_PUBLIC_USE_MOCKS=false
          </code>
          .
        </p>
      </div>
    </>
  );
}
