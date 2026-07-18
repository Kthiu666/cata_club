/**
 * AppShell — shared sidebar layout for the admin and trainer screens,
 * matching `design/admin-panel-mockup-v1.html` and its siblings (members,
 * groups, payments, attendance, trainer, trainer/attendance all share this
 * same shell in the mockups).
 *
 * Replaces the top `Header` nav for these routes only — `Header` still
 * hides itself on them (see AUTH_SHELL_ROUTES-style handling there).
 * Navigation links come from the same `getNavLinksForRole` used by
 * `Header`, so role-based visibility stays centralized in one place.
 *
 * Explicitly NOT used by `/student` or `/student/enroll` — those keep
 * their current structure per the implementation guide's student
 * exception.
 */

"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Search, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getNavLinksForRole, getRoleLabel, getUserInitials, type NavLinkDef } from "@/lib/auth-utils";
import { normalizeText } from "@/app/members/members-utils";
import { NAV_ICON_MAP } from "@/components/Header";

export interface AppShellProps {
  /** Small uppercase label above the page title (defaults to "Panel de gestión"). */
  eyebrow?: string;
  /** Main page heading, shown in the topbar. */
  title: string;
  /** Optional supporting line below the title. */
  subtitle?: string;
  /** Page content, rendered in the main content area below the topbar. */
  children: React.ReactNode;
}

export default function AppShell({
  eyebrow = "Panel de gestión",
  title,
  subtitle,
  children,
}: AppShellProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement>(null);

  const role = session?.user.role ?? null;
  const navLinks = useMemo<NavLinkDef[]>(
    () => getNavLinksForRole(role).filter((link) => link.href !== "/"),
    [role],
  );

  const paletteResults = useMemo<NavLinkDef[]>(() => {
    const term = normalizeText(query);
    if (!term) return navLinks;
    return navLinks.filter((link) => normalizeText(link.label).includes(term));
  }, [navLinks, query]);

  // Ctrl+K / Cmd+K opens the "go to" command palette from anywhere in the shell.
  useEffect((): (() => void) => {
    function handleKeyDown(e: globalThis.KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return (): void => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect((): void => {
    if (paletteOpen) {
      setQuery("");
      setActiveIndex(0);
      paletteInputRef.current?.focus();
    }
  }, [paletteOpen]);

  function goTo(href: string): void {
    setPaletteOpen(false);
    setSidebarOpen(false);
    router.push(href);
  }

  function handlePaletteKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, paletteResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = paletteResults[activeIndex];
      if (target) goTo(target.href);
    }
  }

  return (
    <div className="app-shell flex min-h-screen bg-cata-bg">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-cata-black text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
              <Image src="/brand/cata-club-logo.jpeg" alt="Cata Club" fill className="object-cover" sizes="36px" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold">Cata Club</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Panel de gestión
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={(): void => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-white/55 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
          {navLinks.map((link): React.ReactElement => {
            const isActive = pathname === link.href;
            const Icon = NAV_ICON_MAP[link.href] ?? User;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(): void => setSidebarOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-cata-red/20 text-white" : "text-white/65 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {session && (
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cata-red/25 text-xs font-bold">
                {getUserInitials(session.user.name)}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-semibold">{session.user.name}</p>
                <p className="truncate text-xs text-white/45">{getRoleLabel(session.user.role)}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="shrink-0 rounded-lg p-1.5 text-white/55 hover:bg-white/10 hover:text-cata-red-light"
                aria-label="Cerrar Sesión"
              >
                <LogOut size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={(): void => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cata-border bg-cata-surface px-5 py-5 sm:px-8">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cata-red">{eyebrow}</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-cata-text sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 max-w-xl text-sm text-cata-text/60">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={(): void => setSidebarOpen(true)}
              className="rounded-xl border border-cata-border p-2.5 text-cata-text/65 hover:bg-cata-bg lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(): void => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-cata-border bg-cata-bg px-3.5 py-2.5 text-sm text-cata-text/50 transition-colors hover:border-cata-text/20"
            >
              <Search size={15} strokeWidth={1.5} aria-hidden="true" />
              <span className="hidden sm:inline">Buscar una sección…</span>
              <kbd className="ml-1 hidden rounded-md border border-cata-border bg-cata-surface px-1.5 py-0.5 text-[10px] font-semibold text-cata-text/45 sm:inline">
                Ctrl K
              </kbd>
            </button>
          </div>
        </div>

        <main className="flex-1 px-5 py-8 sm:px-8">{children}</main>
      </div>

      {/* Command palette — "go to" navigation search, role-aware */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-24"
          onClick={(): void => setPaletteOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Buscador de secciones"
            onClick={(e): void => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-cata-surface shadow-elevated"
          >
            <div className="flex items-center gap-2.5 border-b border-cata-border px-4 py-3.5">
              <Search size={16} strokeWidth={1.5} className="shrink-0 text-cata-text/45" aria-hidden="true" />
              <input
                ref={paletteInputRef}
                type="text"
                value={query}
                onChange={(e): void => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handlePaletteKeyDown}
                placeholder="Ir a una sección…"
                aria-label="Ir a una sección"
                className="flex-1 border-none bg-transparent text-sm text-cata-text outline-none placeholder:text-cata-text/35"
              />
              <button
                type="button"
                onClick={(): void => setPaletteOpen(false)}
                className="shrink-0 rounded-md border border-cata-border px-1.5 py-0.5 text-[10px] font-semibold text-cata-text/45"
              >
                ESC
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto py-2">
              {paletteResults.length === 0 && (
                <p className="px-4 py-3 text-sm text-cata-text/45">No se encontraron secciones.</p>
              )}
              {paletteResults.map((link, index): React.ReactElement => {
                const Icon = NAV_ICON_MAP[link.href] ?? User;
                return (
                  <button
                    key={link.href}
                    type="button"
                    onClick={(): void => goTo(link.href)}
                    onMouseEnter={(): void => setActiveIndex(index)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm ${
                      index === activeIndex ? "bg-cata-red/10 text-cata-red" : "text-cata-text hover:bg-cata-bg"
                    }`}
                  >
                    <Icon size={15} strokeWidth={1.5} aria-hidden="true" />
                    {link.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
