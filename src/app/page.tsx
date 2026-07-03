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
  MapPin,
  Target,
  Eye,
  Trophy,
  Heart,
  Award,
  Clock,
  CheckCircle2,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Gestión de Membresías",
    description:
      "Administre estudiantes, representantes y perfiles de membresía con operaciones CRUD completas y búsqueda avanzada.",
  },
  {
    icon: ShieldCheck,
    title: "Validación de Pagos",
    description:
      "Valide comprobantes de pago de membresías, realice seguimiento del estado de los miembros y mantenga una traza de auditoría clara.",
  },
  {
    icon: CalendarDays,
    title: "Horarios y Asistencia",
    description:
      "Organice sesiones de entrenamiento de tenis de mesa, asigne estudiantes por nivel técnico y registre la asistencia.",
  },
];

const valores = [
  {
    icon: Trophy,
    titulo: "Excelencia",
    descripcion:
      "Buscamos la mejora continua en cada entrenamiento, potenciando el talento de cada deportista.",
  },
  {
    icon: Heart,
    titulo: "Compromiso",
    descripcion:
      "Dedicación total a la formación integral de nuestros estudiantes, dentro y fuera de la cancha.",
  },
  {
    icon: Award,
    titulo: "Disciplina",
    descripcion:
      "Base fundamental para alcanzar objetivos deportivos y personales a largo plazo.",
  },
  {
    icon: Zap,
    titulo: "Pasión",
    descripcion:
      "Amor por el tenis de mesa y el deseo de compartirlo con nuevas generaciones de lojanos.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="relative flex w-full flex-col items-center overflow-hidden py-24 text-center sm:py-32">
        {/* Background subtle pattern */}
        <div className="absolute inset-0 bg-logo-glow" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,26,26,0.04),transparent_70%)]" />

        <div className="relative z-10">
          {/* Real logo as central brand asset */}
          <div className="relative mx-auto mb-8 h-32 w-32 overflow-hidden rounded-2xl shadow-elevated sm:h-40 sm:w-40">
            <Image
              src="/brand/cata-club-logo.jpeg"
              alt="Cata Club"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 128px, 160px"
              priority
            />
          </div>

          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-cata-red/80">
            Desde 2013 &mdash; Loja, Ecuador
          </p>
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-cata-charcoal sm:text-6xl lg:text-7xl">
            Cata Club
          </h1>
          <p className="mb-6 text-lg font-medium uppercase tracking-widest text-cata-red/90">
            Tenis de Mesa
          </p>

          {/* Lema institucional */}
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-cata-red/20 bg-cata-red/[0.03] px-6 py-2.5">
            <Trophy size={16} strokeWidth={2} className="text-cata-red" aria-hidden="true" />
            <span className="text-sm font-semibold italic tracking-wide text-cata-red">
              &ldquo;Formando campeones para la vida&rdquo;
            </span>
          </div>

          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-cata-gray sm:text-lg">
            Más de una década formando deportistas de excelencia en la ciudad de Loja.
            Somos un club deportivo especializado formativo donde la disciplina, el compañerismo
            y la pasión por el tenis de mesa construyen campeones dentro y fuera de la cancha.
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
        </div>
      </section>

      {/* Datos Institucionales */}
      <section className="mb-20 w-full">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card flex flex-col items-center p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cata-red/8">
              <Clock size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-cata-charcoal">2013</p>
            <p className="text-sm text-cata-gray">Fundado el 10 de octubre</p>
          </div>
          <div className="card flex flex-col items-center p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cata-red/8">
              <MapPin size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-cata-charcoal">Loja</p>
            <p className="text-sm text-cata-gray">Al lado del Coliseo Ciudad de Loja</p>
          </div>
          <div className="card flex flex-col items-center p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cata-red/8">
              <Users size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-cata-charcoal">Formativo</p>
            <p className="text-sm text-cata-gray">Club deportivo especializado</p>
          </div>
        </div>
      </section>

      {/* Misión y Visión */}
      <section className="mb-20 w-full">
        <div className="mb-10 text-center">
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.25em] text-cata-red/70">
            Propósito Institucional
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-cata-charcoal sm:text-4xl">
            Misión y Visión
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Misión */}
          <div className="card-hover relative overflow-hidden p-8">
            <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-cata-red/[0.03]" />
            <div className="relative">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cata-red/8">
                <Target size={26} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-cata-charcoal">Nuestra Misión</h3>
              <p className="leading-relaxed text-cata-gray">
                Promover y desarrollar la práctica del tenis de mesa mediante procesos de formación
                deportiva de calidad, fomentando el desarrollo integral de niños, adolescentes,
                jóvenes y adultos, fortaleciendo valores, disciplina y excelencia competitiva,
                para contribuir al crecimiento del deporte en el ámbito local, provincial y nacional.
              </p>
            </div>
          </div>

          {/* Visión */}
          <div className="card-hover relative overflow-hidden p-8">
            <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-cata-red/[0.03]" />
            <div className="relative">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cata-red/8">
                <Eye size={26} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-cata-charcoal">Nuestra Visión</h3>
              <p className="leading-relaxed text-cata-gray">
                Ser un club de tenis de mesa líder, reconocido por su excelencia deportiva,
                formación integral y desarrollo sostenible, consolidándose como un referente
                provincial y nacional mediante la preparación de deportistas altamente competitivos
                que integren de manera permanente las selecciones provinciales y nacionales.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="mb-20 w-full">
        <div className="mb-10 text-center">
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.25em] text-cata-red/70">
            Lo que nos define
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-cata-charcoal sm:text-4xl">
            Nuestros Valores
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {valores.map((v) => (
            <div key={v.titulo} className="card-hover flex flex-col items-start p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cata-red/8">
                <v.icon size={22} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-base font-bold text-cata-charcoal">{v.titulo}</h3>
              <p className="text-sm leading-relaxed text-cata-gray">{v.descripcion}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lema destacado */}
      <section className="mb-20 w-full">
        <div className="relative overflow-hidden rounded-3xl bg-cata-navy px-8 py-16 text-center sm:px-16 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,26,26,0.15),transparent_60%)]" />
          <div className="relative z-10">
            <Trophy size={40} strokeWidth={1} className="mx-auto mb-6 text-cata-red-light" aria-hidden="true" />
            <blockquote className="mx-auto max-w-3xl text-2xl font-bold italic leading-snug text-white sm:text-3xl lg:text-4xl">
              &ldquo;Formando campeones para la vida&rdquo;
            </blockquote>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
              Nuestro lema resume lo que hacemos: no solo entrenamos deportistas de alto rendimiento,
              sino personas íntegas que llevan los valores del deporte a cada aspecto de sus vidas.
            </p>
          </div>
        </div>
      </section>

      {/* Features del sistema */}
      <section className="mb-20 w-full">
        <div className="mb-10 text-center">
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.25em] text-cata-red/70">
            Plataforma Administrativa
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-cata-charcoal sm:text-4xl">
            Gestión Integral del Club
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-cata-gray">
            Herramientas diseñadas para simplificar la administración de Cata Club
            y enfocarse en lo que realmente importa: formar campeones.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card-hover flex flex-col items-start p-6 sm:p-7"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cata-red/8">
                <feature.icon
                  size={22}
                  strokeWidth={1.5}
                  className="text-cata-red"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mb-2 text-base font-bold text-cata-charcoal">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-cata-gray">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Portales de demostración por rol */}
      <section className="mb-20 w-full">
        <div className="mb-10 text-center">
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.25em] text-cata-red/70">
            Acceso Rápido
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-cata-charcoal sm:text-4xl">
            Portales de Demostración
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-cata-gray">
            Explore la experiencia Cata Club desde diferentes perspectivas.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            href="/trainer"
            className="card-hover group flex items-start gap-5 p-6 sm:p-8"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cata-red/8">
              <GraduationCap
                size={26}
                strokeWidth={1.5}
                className="text-cata-red"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-base font-bold text-cata-charcoal">
                Panel del Entrenador
              </h3>
              <p className="text-sm leading-relaxed text-cata-gray">
                Sesiones del día, lista de estudiantes con registro de asistencia
                y alertas de salud y seguridad.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cata-red">
                Ver Demo de Entrenador
                <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </span>
            </div>
          </Link>
          <Link
            href="/student"
            className="card-hover group flex items-start gap-5 p-6 sm:p-8"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cata-red/8">
              <UserCircle
                size={26}
                strokeWidth={1.5}
                className="text-cata-red"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-base font-bold text-cata-charcoal">
                Portal del Estudiante
              </h3>
              <p className="text-sm leading-relaxed text-cata-gray">
                Estado de membresía y pagos, horario de entrenamiento y
                carga de comprobantes.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cata-red">
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
          <span className="font-bold text-cata-charcoal">Demo Frontend</span>
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
