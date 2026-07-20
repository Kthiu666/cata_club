/**
 * Admin Dashboard — layout follows design/admin-panel-mockup-v1.html:
 * AppShell sidebar + stat cards, quick actions, recent activity, and a
 * payments-to-review table.
 *
 * All figures are computed from the same typed mock data/services the
 * sibling admin screens use (members-utils, attendance-utils,
 * fetchPaymentValidations) rather than the mockup's hardcoded numbers —
 * "Actividad reciente" and "Pagos por revisar" share one
 * fetchPaymentValidations() call so the two panels never disagree.
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  Calendar,
  DollarSign,
  ArrowRight,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserPlus,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import { fetchPaymentValidations } from "@/services/api";
import type { PaymentValidationRequest } from "@/services/api";
import { formatCurrency, formatDateTime } from "@/lib/format-utils";
import { buildMemberStats } from "@/app/members/members-utils";
import { buildAttendanceStats, getAttendanceRatePercent } from "@/app/attendance/attendance-utils";
import { MOCK_MEMBER_ACCOUNTS } from "@/mocks/members";
import { MOCK_ATTENDANCE_RECORDS } from "@/mocks/attendance";

const quickActions = [
  {
    icon: UserPlus,
    label: "Nuevo estudiante",
    href: "/members",
    description: "Alta de responsable o alumno",
  },
  {
    icon: ShieldCheck,
    label: "Registrar pago",
    href: "/payments",
    description: "Validar comprobante recibido",
  },
  {
    icon: Calendar,
    label: "Tomar asistencia",
    href: "/attendance",
    description: "Registrar la sesión de hoy",
  },
];

/** One line of the "Actividad reciente" feed, derived from a real payment request. */
interface ActivityItem {
  id: string;
  text: string;
  time: string;
  timestamp: string;
  icon: typeof CheckCircle2;
  color: string;
  bg: string;
}

function buildActivityFeed(requests: PaymentValidationRequest[]): ActivityItem[] {
  return requests
    .map((r): ActivityItem => {
      if (r.validationStatus === "validado") {
        return {
          id: r.id,
          text: `Pago de ${r.studentName} validado`,
          time: formatDateTime(r.validatedAt ?? r.uploadedAt),
          timestamp: r.validatedAt ?? r.uploadedAt,
          icon: CheckCircle2,
          color: "text-cata-state-ok",
          bg: "bg-cata-state-ok/10",
        };
      }
      if (r.validationStatus === "rechazado") {
        return {
          id: r.id,
          text: `Comprobante de ${r.studentName} rechazado`,
          time: formatDateTime(r.validatedAt ?? r.uploadedAt),
          timestamp: r.validatedAt ?? r.uploadedAt,
          icon: XCircle,
          color: "text-cata-red",
          bg: "bg-cata-red/10",
        };
      }
      return {
        id: r.id,
        text: `Comprobante de ${r.studentName} pendiente de validar`,
        time: formatDateTime(r.uploadedAt),
        timestamp: r.uploadedAt,
        icon: AlertTriangle,
        color: "text-amber-700",
        bg: "bg-amber-50",
      };
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 4);
}

export default function DashboardPage(): React.ReactElement {
  const [requests, setRequests] = useState<PaymentValidationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPaymentValidations();
      setRequests(data);
    } catch (err) {
      console.error("[dashboard] fetchPaymentValidations failed", err);
      setError("No se pudieron cargar los pagos. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect((): void => {
    void loadRequests();
  }, [loadRequests]);

  const memberStats = useMemo(() => buildMemberStats(MOCK_MEMBER_ACCOUNTS), []);
  const attendanceStats = useMemo(() => buildAttendanceStats(MOCK_ATTENDANCE_RECORDS), []);
  const attendanceRate = getAttendanceRatePercent(attendanceStats);

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.validationStatus === "pendiente"),
    [requests],
  );
  const validatedTotal = useMemo(
    () =>
      requests
        .filter((r) => r.validationStatus === "validado")
        .reduce((sum, r) => sum + r.expectedAmount, 0),
    [requests],
  );
  const activityFeed = useMemo(() => buildActivityFeed(requests), [requests]);
  const reviewQueue = useMemo(
    () => [...requests].sort((a, b) => a.validationStatus.localeCompare(b.validationStatus)).slice(0, 4),
    [requests],
  );

  const stats = [
    {
      icon: Users,
      label: "Estudiantes activos",
      value: String(memberStats.totalStudents),
    },
    {
      icon: DollarSign,
      label: "Ingresos validados",
      value: loading ? "—" : formatCurrency(validatedTotal),
    },
    {
      icon: Clock,
      label: "Pagos pendientes",
      value: loading ? "—" : String(pendingRequests.length),
      alert: !loading && pendingRequests.length > 0,
    },
    {
      icon: Activity,
      label: "Asistencia promedio",
      value: `${attendanceRate}%`,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AppShell
        title="Dashboard"
        subtitle="Resumen de la actividad del club — estudiantes, pagos y asistencia de hoy."
      >
        {/* Stats grid */}
        <div className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={stat.alert ? "card border-2 border-cata-red/30 p-5 sm:p-6" : "card p-5 sm:p-6"}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-cata-red/15">
                <stat.icon size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-cata-text/65">{stat.label}</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-cata-text">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mb-6 flex items-center gap-2">
          <Activity size={16} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          <h2 className="text-lg font-bold text-cata-text">Acciones rápidas</h2>
        </div>
        <div className="mb-12 grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="card-hover group flex items-start gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cata-red/15">
                  <action.icon size={20} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-cata-text">{action.label}</p>
                  <p className="mt-0.5 text-sm text-cata-text/65">{action.description}</p>
                </div>
                <ArrowRight
                  size={16}
                  strokeWidth={1.5}
                  className="mt-1 shrink-0 text-cata-text/30 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Recent activity */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-cata-text">Actividad reciente</h2>
            </div>
            <div className="card p-5">
              {loading && <p className="py-4 text-center text-sm text-cata-text/45">Cargando actividad…</p>}
              {!loading && error && (
                <p className="py-4 text-center text-sm text-cata-red" role="alert">
                  {error}
                </p>
              )}
              {!loading && !error && activityFeed.length === 0 && (
                <p className="py-4 text-center text-sm text-cata-text/45">Sin actividad reciente.</p>
              )}
              {!loading && !error && activityFeed.length > 0 && (
                <div className="space-y-4">
                  {activityFeed.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                        <item.icon size={16} strokeWidth={1.5} className={item.color} aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug text-cata-text">{item.text}</p>
                        <p className="mt-0.5 text-xs text-cata-text/40">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Payments to review */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-cata-text">Pagos por revisar</h2>
              <Link href="/payments" className="text-sm font-medium text-cata-red hover:text-cata-red-light">
                Ir a Pagos
              </Link>
            </div>
            <div className="card overflow-hidden p-0">
              {loading && <p className="p-5 text-center text-sm text-cata-text/45">Cargando pagos…</p>}
              {!loading && error && (
                <p className="p-5 text-center text-sm text-cata-red" role="alert">
                  {error}
                </p>
              )}
              {!loading && !error && reviewQueue.length === 0 && (
                <p className="p-5 text-center text-sm text-cata-text/45">No hay pagos registrados.</p>
              )}
              {!loading && !error && reviewQueue.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-cata-border text-left text-xs uppercase tracking-wider text-cata-text/45">
                        <th className="px-5 py-3 font-medium">Estudiante</th>
                        <th className="px-5 py-3 font-medium">Estado</th>
                        <th className="px-5 py-3 text-right font-medium">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewQueue.map((r) => (
                        <tr key={r.id} className="border-b border-cata-border last:border-0">
                          <td className="px-5 py-3 text-cata-text">{r.studentName}</td>
                          <td className="px-5 py-3">
                            {r.validationStatus === "pendiente" && (
                              <span className="badge badge-warning">Pendiente</span>
                            )}
                            {r.validationStatus === "validado" && (
                              <span className="badge badge-success">Pagado</span>
                            )}
                            {r.validationStatus === "rechazado" && (
                              <span className="badge badge-error">Rechazado</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-cata-text">
                            {formatCurrency(r.expectedAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-cata-text/30">
          Las métricas se calculan a partir de datos de demostración (miembros, pagos y
          asistencia). Los datos reales reemplazarán estos una vez que la API del backend
          esté conectada.
        </p>
      </AppShell>
    </ProtectedRoute>
  );
}
