import type { Metadata } from "next";
import {
  Users,
  ShieldCheck,
  Calendar,
  ClipboardList,
  ArrowRight,
  Clock,
  UserCheck,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Zap,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

export const metadata: Metadata = {
  title: "Panel de Control",
};

const stats = [
  {
    icon: Users,
    label: "Miembros Activos",
    value: "48",
    sub: "12 nuevos este mes",
    trend: "up",
  },
  {
    icon: ShieldCheck,
    label: "Pendientes de Validar",
    value: "3",
    sub: "Esperando revisión",
    highlight: true,
    trend: "alert",
  },
  {
    icon: Calendar,
    label: "Clases de Hoy",
    value: "6",
    sub: "4 canchas en uso",
    trend: "up",
  },
  {
    icon: Clock,
    label: "Pagos Pendientes",
    value: "2",
    sub: "Requieren seguimiento",
    trend: "alert",
  },
];

const quickActions = [
  {
    icon: ShieldCheck,
    label: "Validar Pagos",
    href: "/payments",
    description: "Revisar y aprobar o rechazar comprobantes de pago de membresías",
  },
  {
    icon: Users,
    label: "Gestionar Miembros",
    href: "/members",
    description: "Estudiantes, representantes y perfiles de membresía",
  },
  {
    icon: UserPlus,
    label: "Gestionar Grupos",
    href: "/groups",
    description: "Grupos de entrenamiento, niveles técnicos y asignación de alumnos",
  },
  {
    icon: Calendar,
    label: "Horarios y Asistencia",
    href: "/attendance",
    description: "Horarios de entrenamiento y registros de asistencia",
  },
  {
    icon: ClipboardList,
    label: "Reportes de Asistencia",
    href: "#",
    description: "Consulte la asistencia por horario, período o estudiante",
    disabled: true,
  },
];

const recentActivity = [
  { icon: CheckCircle2, text: "Sofía Martínez — pago validado", time: "Hace 10 min", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: AlertTriangle, text: "3 comprobantes pendientes de revisión", time: "Hace 1 h", color: "text-amber-600", bg: "bg-amber-50" },
  { icon: Users, text: "Nuevo miembro: Mateo Rodríguez", time: "Hace 2 h", color: "text-cata-red", bg: "bg-cata-red/8" },
  { icon: Activity, text: "Sesión de avanzados finalizada — Cancha 1", time: "Hace 3 h", color: "text-blue-600", bg: "bg-blue-50" },
];

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
    <div>
      {/* Header banner */}
      <div className="relative mb-10 overflow-hidden rounded-3xl bg-cata-navy px-6 py-10 sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,26,26,0.15),transparent_50%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cata-red-light/70">
            <Zap size={14} strokeWidth={2} aria-hidden="true" />
            Panel Administrativo
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Panel de Control
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/60">
            Cata Club — Resumen diario, métricas clave y acceso rápido a las funciones
            administrativas del club.
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card-hover p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  stat.highlight
                    ? "bg-cata-red/10"
                    : "bg-cata-warm"
                }`}
              >
                <stat.icon
                  size={22}
                  strokeWidth={1.5}
                  className={
                    stat.highlight ? "text-cata-red" : "text-cata-gray"
                  }
                  aria-hidden="true"
                />
              </div>
              {stat.trend === "up" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <TrendingUp size={10} strokeWidth={2} aria-hidden="true" />
                  Activo
                </span>
              )}
              {stat.trend === "alert" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  <AlertTriangle size={10} strokeWidth={2} aria-hidden="true" />
                  Atención
                </span>
              )}
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-cata-gray">{stat.label}</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-charcoal">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-cata-gray/60">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <Activity size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h2 className="text-lg font-bold text-cata-charcoal">Acciones Rápidas</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {quickActions.map((action) => {
              const content = (
                <div
                  className={`card-hover group flex items-start gap-4 p-5 sm:p-6 ${
                    action.disabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cata-red/8">
                    <action.icon
                      size={22}
                      strokeWidth={1.5}
                      className="text-cata-red"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-cata-charcoal">{action.label}</p>
                    <p className="mt-0.5 text-sm text-cata-gray">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight
                    size={18}
                    strokeWidth={1.5}
                    className="mt-1 shrink-0 text-cata-gray/40 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              );

              if (action.disabled) {
                return <div key={action.label}>{content}</div>;
              }

              return (
                <Link key={action.href} href={action.href}>
                  {content}
                </Link>
              );
            })}
          </div>

          {/* Modules reference */}
          <div className="mt-8 rounded-2xl border border-cata-stone/50 bg-white p-6">
            <h3 className="mb-4 text-sm font-bold text-cata-charcoal">
              Módulos del Sistema
            </h3>
            <div className="grid gap-3 text-sm text-cata-gray sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-2">
                <UserCheck size={14} strokeWidth={1.5} className="shrink-0 text-cata-red" aria-hidden="true" />
                <span>Acceso y Usuarios — inicio de sesión, cuentas, credenciales</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} strokeWidth={1.5} className="shrink-0 text-cata-red" aria-hidden="true" />
                <span>Operaciones — horarios, registro de asistencia</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} strokeWidth={1.5} className="shrink-0 text-cata-red" aria-hidden="true" />
                <span>Finanzas — membresías, validación de pagos</span>
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList size={14} strokeWidth={1.5} className="shrink-0 text-cata-red" aria-hidden="true" />
                <span>Consultas — estado de horarios y membresías</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity sidebar */}
        <div>
          <div className="mb-5 flex items-center gap-2">
            <Clock size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h2 className="text-lg font-bold text-cata-charcoal">Actividad Reciente</h2>
          </div>
          <div className="card p-5">
            <div className="space-y-4">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                    <item.icon size={16} strokeWidth={1.5} className={item.color} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-cata-charcoal">{item.text}</p>
                    <p className="mt-0.5 text-xs text-cata-gray/60">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Demo data note */}
      <p className="mt-10 text-center text-xs text-cata-gray/40">
        Las métricas del dashboard son datos de demostración. Los datos reales reemplazarán
        estos una vez que la API del backend esté conectada.
      </p>
    </div>
    </ProtectedRoute>
  );
}
