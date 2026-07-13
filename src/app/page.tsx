"use client";

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
  Star,
  Search,
  SearchCheck,
  Quote,
  Play,
  Award as TrophyIcon,
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
      "Buscamos la mejora continua en cada entrenamiento y competencia, potenciando el talento de cada deportista.",
  },
  {
    icon: Heart,
    titulo: "Compromiso",
    descripcion:
      "Dedicación total al desarrollo integral de nuestros miembros, dentro y fuera de la cancha.",
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
    <div className="-mx-4 -my-10 sm:-mx-8 lg:-mx-12">
      {/* ── HERO ── */}
      <section
        id="inicio"
        className="relative flex min-h-[calc(100vh-64px)] w-full items-center overflow-hidden"
      >
        {/* Fondo oscuro profundo */}
        <div className="absolute inset-0 bg-cata-dark" />

        {/* Glow radial rojo sutil en el centro */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,26,26,0.06),transparent_60%)]" />

        {/* Líneas de red tenue (simulan red de mesa) */}
        <div className="absolute inset-0 opacity-[0.03]">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute w-full border-t border-white"
              style={{ top: `${8 + i * 8}%` }}
            />
          ))}
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute h-full border-l border-white"
              style={{ left: `${6 + i * 6}%` }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-8xl items-center gap-12 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-0">
          {/* Columna izquierda — texto */}
          <div className="order-2 lg:order-1">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
              <Star size={14} strokeWidth={2} className="text-cata-red" aria-hidden="true" />
              Club de Tenis de Mesa
            </div>

            <h1 className="mb-2 text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Cata Club
            </h1>
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-cata-red sm:text-5xl lg:text-6xl">
              Tenis de Mesa
            </h2>

            <p className="mb-8 max-w-lg text-base leading-relaxed text-white/60">
              Más de una década formando deportistas de excelencia en la ciudad de Loja.
              Somos un club deportivo especializado en tenis de mesa de la disciplina,
              el compañerismo y la pasión por el tenis de mesa, generando
              campeones y campeones dentro y fuera de la cancha.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="#proposito"
                className="inline-flex items-center gap-2 rounded-xl bg-cata-red px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-cata-red-light hover:shadow-lg hover:shadow-cata-red/20"
              >
                <Users size={16} strokeWidth={2} aria-hidden="true" />
                Conócenos
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-transparent px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/5"
              >
                <Play size={16} strokeWidth={2} aria-hidden="true" />
                Ver Video
              </button>
            </div>
          </div>

          {/* Columna derecha — composición visual de paleta */}
          <div className="relative order-1 flex h-[400px] items-center justify-center lg:order-2 lg:h-[600px]">
            {/* Paleta roja (forma óvalo con blur) */}
            <div className="absolute h-[380px] w-[280px] rotate-[-12deg] rounded-[50%_50%_45%_45%] bg-gradient-to-br from-[#c41e1e] via-[#8B1A1A] to-[#5E1111] opacity-90 blur-[1px] shadow-2xl" />

            {/* Mango de la paleta */}
            <div className="absolute left-[20%] top-[60%] h-[200px] w-[24px] rotate-[-12deg] rounded-full bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#5C3317] shadow-lg" />

            {/* Pelota de ping-pong */}
            <div className="absolute right-[20%] top-[55%] h-[50px] w-[50px] rounded-full bg-gradient-to-br from-[#fff8f0] via-[#f5e6d3] to-[#e8c9a0] shadow-xl">
              <div className="absolute left-[20%] top-[15%] h-[12px] w-[12px] rounded-full bg-white opacity-70" />
            </div>

            {/* Efecto de brillo/glow detrás */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_50%,rgba(139,26,26,0.15),transparent_60%)]" />

            {/* Tarjeta flotante "+10 Años" */}
            <div className="absolute bottom-[15%] right-[10%] rounded-2xl border border-white/10 bg-cata-dark-elevated/90 p-4 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cata-red/20">
                  <TrophyIcon size={20} strokeWidth={1.5} className="text-cata-red" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">+10 Años</p>
                  <p className="text-xs text-white/50">Formando campeones</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ROW ── */}
      <section className="relative w-full border-y border-white/5 bg-cata-dark-elevated/50 py-8">
        <div className="mx-auto flex max-w-8xl items-center justify-between px-4 sm:px-8 lg:px-12">
          {/* Puntos decorativos izquierda */}
          <div className="hidden lg:flex flex-col gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-1.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="h-1 w-1 rounded-full bg-cata-red/30" />
                ))}
              </div>
            ))}
          </div>

          {/* Stats cards */}
          <div className="grid w-full gap-4 sm:grid-cols-3 lg:mx-8">
            <div className="flex items-center gap-4 rounded-xl bg-cata-dark/60 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                <Star size={24} strokeWidth={1.5} className="text-cata-red" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">2013</p>
                <p className="text-sm text-white/50">Fundación del Club</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl bg-cata-dark/60 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                <Users size={24} strokeWidth={1.5} className="text-cata-red" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">Loja</p>
                <p className="text-sm text-white/50">Altitud de 2.100 m.s.n.m.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl bg-cata-dark/60 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cata-red/15">
                <Search size={24} strokeWidth={1.5} className="text-cata-red" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">Formativo</p>
                <p className="text-sm text-white/50">Enfoque en la formación integral</p>
              </div>
            </div>
          </div>

          {/* Puntos decorativos derecha */}
          <div className="hidden lg:flex flex-col gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-1.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="h-1 w-1 rounded-full bg-cata-red/30" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MISIÓN Y VISIÓN ── */}
      <section id="proposito" className="relative w-full py-20">
        <div className="absolute inset-0 bg-cata-dark" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,26,26,0.04),transparent_50%)]" />

        <div className="relative z-10 mx-auto max-w-8xl px-4 sm:px-8 lg:px-12">
          <div className="mb-12 text-center">
            <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
              Propósito Institucional
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Misión y Visión
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Misión */}
            <div className="rounded-2xl border border-white/10 bg-cata-dark-elevated/80 p-8 backdrop-blur-sm">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cata-red/15">
                <Target size={28} strokeWidth={1.5} className="text-cata-red" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">Misión</h3>
              <p className="leading-relaxed text-white/60">
                Promover el desarrollo de la práctica del tenis de mesa mediante procesos de
                formación integral que vinculen aspectos técnicos, tácticos, físicos, psicológicos,
                educativos, familiares y sociales, fortaleciendo valores, disciplina y excelencia
                para contribuir al crecimiento de atletas en el ámbito local, nacional e
                internacional.
              </p>
            </div>

            {/* Visión */}
            <div className="rounded-2xl border border-white/10 bg-cata-dark-elevated/80 p-8 backdrop-blur-sm">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cata-red/15">
                <Eye size={28} strokeWidth={1.5} className="text-cata-red" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">Visión</h3>
              <p className="leading-relaxed text-white/60">
                Ser un club de tenis de mesa reconocido por su excelencia deportiva,
                formación integral y compromiso con la comunidad, formando personas
                íntegras y campeones comprometidos. Ser referentes provinciales,
                regionales y nacionales en la formación y promoción de los talentos,
                contribuyendo al desarrollo del tenis de mesa en el país.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALORES ── */}
      <section id="valores" className="relative w-full py-20">
        <div className="absolute inset-0 bg-cata-dark" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(139,26,26,0.04),transparent_50%)]" />

        <div className="relative z-10 mx-auto max-w-8xl px-4 sm:px-8 lg:px-12">
          <div className="mb-12 text-center">
            <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
              Lo que nos define
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Nuestros Valores
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {valores.map((v) => (
              <div
                key={v.titulo}
                className="rounded-2xl border border-white/10 bg-cata-dark-elevated/60 p-6 transition-all duration-200 hover:border-white/20 hover:bg-cata-dark-elevated/80"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cata-red/15">
                  <v.icon size={22} strokeWidth={1.5} className="text-cata-red" />
                </div>
                <h3 className="mb-2 text-base font-bold text-white">{v.titulo}</h3>
                <p className="text-sm leading-relaxed text-white/60">{v.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEMA / FOOTER DESTACADO ── */}
      <section className="relative w-full overflow-hidden py-20">
        {/* Fondo con imagen simulada de tenis de mesa usando gradientes */}
        <div className="absolute inset-0 bg-cata-dark" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(139,26,26,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_60%,rgba(90,20,20,0.08),transparent_50%)]" />

        {/* Overlay oscuro para legibilidad */}
        <div className="absolute inset-0 bg-cata-dark/60" />

        {/* Siluetas difuminadas de jugadores (simuladas con gradientes) */}
        <div className="absolute bottom-0 left-[10%] h-[300px] w-[200px] rounded-full bg-gradient-to-t from-cata-dark via-cata-dark/80 to-transparent opacity-40 blur-2xl" />
        <div className="absolute bottom-0 right-[15%] h-[250px] w-[180px] rounded-full bg-gradient-to-t from-cata-dark via-cata-dark/80 to-transparent opacity-30 blur-2xl" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-8 lg:px-12">
          <Quote
            size={48}
            strokeWidth={1.5}
            className="mx-auto mb-6 text-cata-red/50"
            aria-hidden="true"
          />

          <blockquote className="mb-4 text-3xl font-bold italic leading-snug text-white sm:text-4xl lg:text-5xl">
            &ldquo;Formando campeones para la vida&rdquo;
          </blockquote>

          <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/60">
            No solo entrenamos atletas, formamos personas con valores, disciplina y sueños sin límites.
          </p>
        </div>
      </section>

      {/* ── FEATURES DEL SISTEMA ── */}
      <section className="relative w-full py-20">
        <div className="absolute inset-0 bg-cata-dark" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,26,26,0.03),transparent_50%)]" />

        <div className="relative z-10 mx-auto max-w-8xl px-4 sm:px-8 lg:px-12">
          <div className="mb-12 text-center">
            <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.25em] text-cata-red/70">
              Plataforma Administrativa
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Gestión Integral del Club
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/50">
              Herramientas diseñadas para simplificar la administración de Cata Club
              y enfocarse en lo que realmente importa: formar campeones.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-cata-dark-elevated/60 p-6 sm:p-7 transition-all duration-200 hover:border-white/20"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cata-red/15">
                  <feature.icon
                    size={22}
                    strokeWidth={1.5}
                    className="text-cata-red"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mb-2 text-base font-bold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/60">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PORTALES DE DEMOSTRACIÓN ── */}
      <section className="relative w-full py-20">
        <div className="absolute inset-0 bg-cata-dark" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,26,26,0.04),transparent_50%)]" />

        <div className="relative z-10 mx-auto max-w-8xl px-4 sm:px-8 lg:px-12">
          <div className="mb-12 text-center">
            <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.25em] text-cata-red/70">
              Acceso Rápido
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Portales de Demostración
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/50">
              Explore la experiencia Cata Club desde diferentes perspectivas.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Link
              href="/trainer"
              className="group flex items-start gap-5 rounded-2xl border border-white/10 bg-cata-dark-elevated/60 p-6 sm:p-8 transition-all duration-200 hover:border-white/20"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cata-red/15">
                <GraduationCap
                  size={26}
                  strokeWidth={1.5}
                  className="text-cata-red"
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 text-base font-bold text-white">
                  Panel del Entrenador
                </h3>
                <p className="text-sm leading-relaxed text-white/60">
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
              className="group flex items-start gap-5 rounded-2xl border border-white/10 bg-cata-dark-elevated/60 p-6 sm:p-8 transition-all duration-200 hover:border-white/20"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cata-red/15">
                <UserCircle
                  size={26}
                  strokeWidth={1.5}
                  className="text-cata-red"
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 text-base font-bold text-white">
                  Portal del Estudiante
                </h3>
                <p className="text-sm leading-relaxed text-white/60">
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
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative w-full border-t border-white/5 bg-cata-dark-elevated/30 py-8">
        <div className="mx-auto max-w-8xl px-4 text-center sm:px-8 lg:px-12">
          <p className="text-xs text-white/40">
            <span className="font-semibold text-white/60">Cata Club</span> &mdash; Tenis de Mesa &copy; 2026. Todos los derechos reservados.
          </p>
          <p className="mt-1 text-[10px] text-white/25">
            Demo Frontend — Listo para integración con backend mediante NEXT_PUBLIC_USE_MOCKS=false
          </p>
        </div>
      </footer>
    </div>
  );
}
