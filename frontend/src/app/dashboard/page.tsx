/**
 * Panel de Control — Admin overview (Fase 7, final phase).
 *
 * Connected to the real backend: `GET /api/dashboard` composes counts from
 * `/personas`, `/membresias/pagos*` and `/asistencias/horarios` — the same
 * FastAPI resources Fases 2-4 already proxy — since there is no backend
 * aggregation endpoint (see src/app/api/dashboard/route.ts).
 *
 * The former "Actividad Reciente" section (mock data: "Sofía Martínez —
 * pago validado", etc.) has been removed rather than left with fabricated
 * content — there is no audit-log/activity-feed endpoint in the backend to
 * back it with real data, and no per-persona timestamped event history
 * exists to derive one from. If that need resurfaces, it requires a new
 * backend endpoint, not a frontend workaround.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
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
  AlertTriangle,
  Zap,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { fetchDashboardStats, type DashboardStats } from "@/services/api";

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
    description: "Grupos de entrenamiento, niveles técnicos y asignación de estudiantes",
  },
  {
    icon: Calendar,
    label: "Horarios y Asistencia",
    href: "/attendance",
    description: "Horarios de entrenamiento y registros de asistencia",
  },
];

interface StatCardData {
  icon: LucideIcon;
  label: string;
  value: number;
  sub: string;
  trend: "up" | "alert";
}

function buildStatCards(stats: DashboardStats): StatCardData[] {
  return [
    {
      icon: Users,
      label: "Miembros Registrados",
      value: stats.totalPersonas,
      sub: "Personas registradas en el club",
      trend: "up",
    },
    {
      icon: ShieldCheck,
      label: "Membresías Activas",
      value: stats.activeMemberships,
      sub: "Con estado activo",
      trend: "up",
    },
    {
      icon: Clock,
      label: "Pagos Pendientes de Validar",
      value: stats.pendingPayments,
      sub: stats.pendingPayments > 0 ? "Esperando revisión" : "Sin pendientes",
      trend: stats.pendingPayments > 0 ? "alert" : "up",
    },
    {
      icon: Calendar,
      label: "Horarios de Hoy",
      value: stats.todaySchedules,
      sub: "Entrenamientos programados para hoy",
      trend: "up",
    },
  ];
}

export default function DashboardPage(): React.ReactElement {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setStats(await fetchDashboardStats());
    } catch {
      setError("No se pudieron cargar las estadísticas del panel. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const statCards = stats ? buildStatCards(stats) : [];

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div>
        {/* Hero Banner */}
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-cata-border bg-cata-surface px-6 py-10 shadow-elevated sm:px-10 sm:py-12">
          <div className="absolute inset-0 bg-logo-glow" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cata-red">
              <Zap size={14} strokeWidth={2} aria-hidden="true" />
              Panel Administrativo
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-cata-text sm:text-4xl">
              Panel de Control
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-cata-text/60">
              Cata Club — Resumen diario, métricas clave y acceso rápido a las funciones
              administrativas del club.
            </p>
          </div>
        </div>

        {error && (
          <div
            className="mb-6 flex items-center gap-2 rounded-xl border border-cata-red/30 bg-cata-red/10 px-4 py-3 text-sm text-cata-red"
            role="alert"
          >
            <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
            {error}
            <button type="button" onClick={() => void loadStats()} className="btn-ghost ml-auto text-xs">
              Reintentar
            </button>
          </div>
        )}

        {/* Stats grid */}
        {loading && !stats ? (
          <div className="mb-12 flex items-center justify-center gap-2 py-16">
            <Clock size={16} strokeWidth={1.5} className="animate-spin text-cata-text/65" aria-hidden="true" />
            <p className="text-sm text-cata-text/50">Cargando estadísticas...</p>
          </div>
        ) : (
          <div className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
              const isAlert = stat.trend === "alert";
              return (
                <div
                  key={stat.label}
                  className={
                    isAlert
                      ? "card border-2 border-cata-red/40 bg-cata-yellow/10 p-6 shadow-elevated sm:p-7"
                      : "card p-5 sm:p-6"
                  }
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        isAlert ? "bg-cata-yellow/25" : "bg-cata-red/15"
                      }`}
                    >
                      <stat.icon
                        size={22}
                        strokeWidth={isAlert ? 2 : 1.5}
                        className="text-cata-red"
                        aria-hidden="true"
                      />
                    </div>
                    {stat.trend === "up" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-cata-state-ok/10 px-2 py-0.5 text-[10px] font-semibold text-cata-state-ok">
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
                  <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">{stat.label}</p>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-cata-text/40">{stat.sub}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Actions — full width now that Actividad Reciente (mock-only) has been removed */}
        <div className="mb-6 flex items-center gap-2">
          <Activity size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-lg font-bold text-cata-text">Acciones Rápidas</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="card-hover group flex items-start gap-4 p-5 sm:p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cata-red/15">
                  <action.icon
                    size={22}
                    strokeWidth={1.5}
                    className="text-cata-red"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-cata-text">{action.label}</p>
                  <p className="mt-0.5 text-sm text-cata-text/65">
                    {action.description}
                  </p>
                </div>
                <ArrowRight
                  size={18}
                  strokeWidth={1.5}
                  className="mt-1 shrink-0 text-cata-text/30 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>

        {/* Modules reference */}
        <div className="card mt-8 p-6">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
            <h3 className="text-sm font-bold text-cata-text">Módulos del Sistema</h3>
          </div>
          <div className="grid gap-3 text-sm text-cata-text/65 sm:grid-cols-2 lg:grid-cols-4">
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
    </ProtectedRoute>
  );
}
