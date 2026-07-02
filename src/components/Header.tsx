/**
 * Header — Top navigation bar for Cata Club Admin
 *
 * Navigation links use the canonical getNavLinksForRole() helper
 * so the nav contract is always consistent across the app.
 *
 *  - Unauthenticated: only Inicio and Iniciar Sesión.
 *  - Admin: Admin + Members + Payments.
 *  - Trainer: Trainer panel.
 *  - Responsible payer / account owner: Account portal.
 */

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { LucideProps } from "lucide-react";
import {
  LayoutDashboard,
  ShieldCheck,
  LogIn,
  LogOut,
  Menu,
  X,
  House,
  GraduationCap,
  User,
  Users,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getNavLinksForRole, type NavLinkDef } from "@/lib/auth-utils";

interface NavLink {
  href: string;
  label: string;
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
}

/**
 * Map canonical href → lucide icon component.
 * Single source of truth for icon assignment — maps what getNavLinksForRole
 * returns to the UI layer.
 */
const NAV_ICON_MAP: Record<string, React.ForwardRefExoticComponent<
  Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
>> = {
  "/": House,
  "/login": LogIn,
  "/dashboard": LayoutDashboard,
  "/members": Users,
  "/payments": ShieldCheck,
  "/attendance": Calendar,
  "/trainer": GraduationCap,
  "/student": GraduationCap,
};

/**
 * Build the navigation links from the canonical helper + icon map.
 */
function useNavLinks(): NavLink[] {
  const { isAuthenticated, session } = useAuth();

  return useMemo<NavLink[]>(() => {
    const role = isAuthenticated && session ? session.user.role : null;
    const defs: NavLinkDef[] = getNavLinksForRole(role);
    return defs.map((def) => ({
      href: def.href,
      label: def.label,
      icon: NAV_ICON_MAP[def.href] ?? House,
    }));
  }, [isAuthenticated, session]);
}

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, session, logout, isLoading } = useAuth();
  const links = useNavLinks();

  // FOUC prevention: show minimal skeleton during session hydration
  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 border-b border-cata-stone/60 bg-white/95 backdrop-blur-md">
        <nav className="mx-auto flex max-w-8xl items-center justify-between px-4 py-3 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3 text-lg font-semibold tracking-tight text-cata-charcoal">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-cata-stone/30" />
            <span className="hidden sm:inline">Cata Club</span>
            <span className="ml-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700">
              Demo
            </span>
          </div>
        </nav>
      </header>
    );
  }

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
          {links.map((link) => {
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

          {/* User menu — shown when authenticated */}
          {isAuthenticated && session && (
            <li className="ml-2 flex items-center gap-2 border-l border-cata-stone/50 pl-3">
              <span className="flex items-center gap-1.5 text-xs text-cata-gray">
                <User size={13} strokeWidth={1.5} aria-hidden="true" />
                <span className="max-w-[120px] truncate">{session.user.name}</span>
              </span>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-cata-gray transition-colors hover:bg-cata-warm hover:text-cata-red"
                aria-label="Cerrar Sesión"
              >
                <LogOut size={13} strokeWidth={1.5} aria-hidden="true" />
                <span className="hidden lg:inline">Salir</span>
              </button>
            </li>
          )}
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
            {links.map((link) => {
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

            {/* User section in mobile menu */}
            {isAuthenticated && session && (
              <li className="border-t border-cata-stone/30 pt-3 mt-3">
                <div className="flex items-center gap-2 px-3.5 py-2 text-xs text-cata-gray">
                  <User size={14} strokeWidth={1.5} aria-hidden="true" />
                  <span className="truncate">{session.user.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-cata-gray transition-colors hover:bg-cata-warm hover:text-cata-red"
                >
                  <LogOut size={17} strokeWidth={1.5} aria-hidden="true" />
                  Cerrar Sesión
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
