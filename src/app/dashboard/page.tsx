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
  title: "Dashboard",
};

const stats = [
  {
    icon: Users,
    label: "Active Members",
    value: "48",
    sub: "12 new this month",
  },
  {
    icon: ShieldCheck,
    label: "Pending Validations",
    value: "3",
    sub: "Awaiting review",
    highlight: true,
  },
  {
    icon: Calendar,
    label: "Today's Classes",
    value: "6",
    sub: "4 courts in use",
  },
  {
    icon: Clock,
    label: "Pending Payments",
    value: "2",
    sub: "Require follow-up",
  },
];

const quickActions = [
  {
    icon: ShieldCheck,
    label: "Validate Payments",
    href: "/payments",
    description: "Review and approve or reject membership payment proofs",
  },
  {
    icon: Users,
    label: "Manage Members",
    href: "#",
    description: "Students, representatives, and membership profiles",
    disabled: true,
  },
  {
    icon: Calendar,
    label: "Schedules & Attendance",
    href: "#",
    description: "Training schedules and attendance records",
    disabled: true,
  },
  {
    icon: ClipboardList,
    label: "Attendance Reports",
    href: "#",
    description: "Consult attendance by schedule, period, or student",
    disabled: true,
  },
];

export default function DashboardPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-cata-charcoal sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-cata-gray">
          Cata Club — overview and quick access
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
          Quick Actions
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
          System Modules
        </h3>
        <div className="grid gap-3 text-sm text-cata-gray sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2">
            <UserCheck size={14} strokeWidth={1.5} className="shrink-0 text-cata-red" aria-hidden="true" />
            <span>Access &amp; Users — login, accounts, credentials</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} strokeWidth={1.5} className="shrink-0 text-cata-red" aria-hidden="true" />
            <span>Operations — schedules, attendance tracking</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} strokeWidth={1.5} className="shrink-0 text-cata-red" aria-hidden="true" />
            <span>Finance — memberships, payment validation</span>
          </div>
          <div className="flex items-center gap-2">
            <ClipboardList size={14} strokeWidth={1.5} className="shrink-0 text-cata-red" aria-hidden="true" />
            <span>Consultation — schedule and membership status</span>
          </div>
        </div>
      </div>

      {/* Placeholder note */}
      <p className="mt-8 text-center text-xs text-cata-gray/50">
        Dashboard metrics are static placeholders. Wire API calls to show live
        data when the backend is connected.
      </p>
    </div>
  );
}
