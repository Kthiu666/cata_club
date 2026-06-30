import Link from "next/link";
import Image from "next/image";
import {
  Users,
  ShieldCheck,
  CalendarDays,
  LayoutDashboard,
  LogIn,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Membership Management",
    description:
      "Manage students, representatives, and membership profiles with full CRUD operations and search.",
  },
  {
    icon: ShieldCheck,
    title: "Payment Validation",
    description:
      "Validate membership payment proofs, track member status, and maintain a clear audit trail for every transaction.",
  },
  {
    icon: CalendarDays,
    title: "Scheduling & Attendance",
    description:
      "Organise table tennis training sessions, assign students by technical level, and record attendance across all sessions.",
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
          Table tennis club administration system. Manage memberships, validate
          payments, and track training attendance &mdash; all in one place.
        </p>
        <p className="mb-12 text-sm text-cata-gray/40">
          University software project &mdash; Pair 3
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/dashboard" className="btn-primary shadow-soft">
            <LayoutDashboard size={16} strokeWidth={2} aria-hidden="true" />
            Dashboard
          </Link>
          <Link href="/login" className="btn-secondary shadow-soft">
            <LogIn size={16} strokeWidth={2} aria-hidden="true" />
            Sign In
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

      {/* API note */}
      <div className="mb-20 w-full rounded-2xl border border-cata-stone/50 bg-white p-6">
        <p className="text-center text-xs text-cata-gray">
          API client switches between local mocks and the real backend via{" "}
          <code className="rounded bg-cata-warm px-1.5 py-0.5 font-mono text-xs">
            NEXT_PUBLIC_USE_MOCKS
          </code>
          . Set to{" "}
          <code className="rounded bg-cata-warm px-1.5 py-0.5 font-mono text-xs">
            false
          </code>{" "}
          to connect the Python backend.
        </p>
      </div>
    </div>
  );
}
