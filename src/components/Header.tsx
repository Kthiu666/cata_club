/**
 * Header — Top navigation bar for Cata Club Admin
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { LucideProps } from "lucide-react";
import {
  LayoutDashboard,
  ShieldCheck,
  LogIn,
  Menu,
  X,
  House,
  GraduationCap,
  UserCircle,
} from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
}

/**
 * Nav note: "/dashboard" is the admin overview. The label reads "Admin"
 * so role-demo navigation is unambiguous alongside Trainer / Student.
 */
const navLinks: NavLink[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/dashboard", label: "Administración", icon: LayoutDashboard },
  { href: "/trainer", label: "Entrenador", icon: GraduationCap },
  { href: "/student", label: "Estudiante", icon: UserCircle },
  { href: "/payments", label: "Membresías y Pagos", icon: ShieldCheck },
  { href: "/login", label: "Iniciar Sesión", icon: LogIn },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-cata-stone/60 bg-white/95 backdrop-blur-md">
      <nav className="mx-auto flex max-w-8xl items-center justify-between px-4 py-3 sm:px-8 lg:px-12">
        {/* Brand — real logo as identity anchor */}
        <Link
          href="/"
          className="flex items-center gap-3 text-lg font-semibold tracking-tight text-cata-charcoal"
        >
          <div className="relative h-8 w-8 overflow-hidden rounded-lg">
            <Image
              src="/brand/cata-club-logo.jpeg"
              alt=""
              fill
              className="object-cover"
              sizes="32px"
              priority
            />
          </div>
          <span className="hidden sm:inline">Cata Club</span>
          <span className="ml-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700">
            Demo
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-cata-red/8 text-cata-red"
                      : "text-cata-gray hover:bg-cata-warm hover:text-cata-charcoal"
                  }`}
                >
                  <link.icon size={15} strokeWidth={1.5} aria-hidden="true" />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-xl p-2.5 text-cata-gray hover:bg-cata-warm hover:text-cata-charcoal md:hidden"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {menuOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
        </button>
      </nav>

      {/* Mobile nav panel */}
      {menuOpen && (
        <div className="border-t border-cata-stone/60 bg-white md:hidden shadow-soft">
          <ul className="space-y-0.5 px-4 py-4">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-cata-red/8 text-cata-red"
                        : "text-cata-gray hover:bg-cata-warm hover:text-cata-charcoal"
                    }`}
                  >
                    <link.icon size={17} strokeWidth={1.5} aria-hidden="true" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
}
