import type { Metadata } from "next";
import {
  Users,
  ShieldCheck,
  Calendar,
  ClipboardList,
  ArrowRight,
  Clock,
  UserCheck,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Panel de Control",
};

const stats = [
  {
    icon: Users,
    label: "Miembros Activos",
    value: "48",
    sub: "12 nuevos este mes",
  },
  {
    icon: ShieldCheck,
    label: "Pendientes de Validar",
    value: "3",
    sub: "Esperando revisión",
    highlight: true,
  },
  {
    icon: Calendar,
    label: "Clases de Hoy",
    value: "6",
    sub: "4 canchas en uso",
  },
  {
    icon: Clock,
    label: "Pagos Pendientes",
    value: "2",
    sub: "Requieren seguimiento",
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
    href: "#",
    description: "Estudiantes, representantes y perfiles de membresía",
    disabled: true,
  },
  {
    icon: Calendar,
    label: "Horarios y Asistencia",
    href: "#",
    description: "Horarios de entrenamiento y registros de asistencia",
    disabled: true,
  },
  {
    icon: ClipboardList,
    label: "Reportes de Asistencia",
    href: "#",
    description: "Consulte la asistencia por horario, período o estudiante",
    disabled: true,
  },
];

export default function DashboardPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-cata-charcoal sm:text-3xl">
          Panel de Control
        </h1>
        <p className="mt-1 text-sm text-cata-gray">
          Cata Club — resumen y acceso rápido
        </p>
      </div>

      {/* Stats grid */}
      <div className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card-hover p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  stat.highlight
                    ? "bg-cata-red/8"
                    : "bg-cata-warm"
                }`}
              >
                <stat.icon
                  size={18}
                  strokeWidth={1.5}
                  className={
                    stat.highlight ? "text-cata-red" : "text-cata-gray"
                  }
                  aria-hidden="true"
                />
              </div>
            </div>
            <p className="text-sm font-medium text-cata-gray">{stat.label}</p>
            <p className="mt-0.5 text-3xl font-bold tracking-tight text-cata-charcoal">
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-cata-gray/60">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        <h2 className="mb-5 text-lg font-semibold text-cata-charcoal">
          Acciones Rápidas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map((action) => {
            const content = (
              <div
                className={`card-hover group flex items-start gap-4 p-5 sm:p-6 ${
                  action.disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cata-red/8">
                  <action.icon
                    size={18}
                    strokeWidth={1.5}
                    className="text-cata-red"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-cata-charcoal">{action.label}</p>
                  <p className="mt-0.5 text-sm text-cata-gray">
                    {action.description}
                  </p>
                </div>
                <ArrowRight
                  size={16}
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
      </div>

      {/* Modules reference */}
      <div className="rounded-2xl border border-cata-stone/50 bg-white p-6">
        <h3 className="mb-3 text-sm font-semibold text-cata-charcoal">
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

      {/* Demo data note */}
      <p className="mt-8 text-center text-xs text-cata-gray/40">
        Las métricas del dashboard son datos de demostración. Los datos reales reemplazarán
        estos una vez que la API del backend esté conectada.
      </p>
    </div>
  );
}
