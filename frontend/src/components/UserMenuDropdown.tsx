/**
 * UserMenuDropdown — floating "Perfil / Cerrar sesión" panel shared by the
 * sidebar (AppShell) and header (desktop) user-menu triggers, so both entry
 * points offer the exact same two options (see issue #35).
 */

"use client";

import Link from "next/link";
import { User, LogOut } from "lucide-react";

interface UserMenuDropdownProps {
  /** Called after the logout item is clicked. */
  onLogout: () => void;
  /** Called on any item click (typically closes the dropdown). */
  onNavigate: () => void;
  /** Positioning classes — differ between the sidebar (opens up) and header (opens down). */
  className?: string;
}

export default function UserMenuDropdown({
  onLogout,
  onNavigate,
  className = "",
}: UserMenuDropdownProps): React.ReactElement {
  return (
    <div
      className={`z-50 rounded-xl border border-white/10 bg-cata-dark p-1.5 shadow-elevated ${className}`}
    >
      <Link
        href="/profile"
        onClick={onNavigate}
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <User size={15} strokeWidth={1.5} aria-hidden="true" />
        Perfil
      </Link>
      <button
        type="button"
        onClick={(): void => {
          onLogout();
          onNavigate();
        }}
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/65 transition-colors hover:bg-white/[0.08] hover:text-cata-red-light"
      >
        <LogOut size={15} strokeWidth={1.5} aria-hidden="true" />
        Cerrar Sesión
      </button>
    </div>
  );
}
