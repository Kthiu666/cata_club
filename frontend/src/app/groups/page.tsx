/**
 * Grupos — Placeholder page for future group/schedule management.
 *
 * All ranking functionality (levels, assignments, reingreso, justificativos)
 * has been extracted to /ranking/page.tsx (issue #44). This page will
 * eventually contain HorarioEntrenamiento-based group/schedule management
 * once that feature is implemented.
 */

"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";
import { Users, Construction } from "lucide-react";

export default function GroupsPage(): React.ReactElement {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AppShell
        eyebrow="Gestión Operativa"
        title="Grupos y Horarios"
      >
        <div className="card flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cata-red/10">
            <Construction size={28} strokeWidth={1.5} className="text-cata-red" aria-hidden="true" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-cata-text">
            Próximamente
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-cata-text/60">
            La gestión de grupos y horarios de entrenamiento estará disponible
            en una próxima actualización. Mientras tanto, podés gestionar los
            niveles de ranking desde{" "}
            <a href="/ranking" className="font-medium text-cata-red underline underline-offset-2 hover:text-cata-red/80">
              Ranking
            </a>.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-cata-text/40">
            <Users size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>HorarioEntrenamiento · en desarrollo</span>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
