/**
 * /profile — Placeholder landing page for the "Perfil" entry in the new
 * user-menu dropdown (see issue #35).
 *
 * The actual profile screen's content/route is a separate, not-yet-built
 * issue; #35 explicitly allows shipping the menu item first pointing at a
 * placeholder route so the menu itself isn't blocked on that work.
 */

"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "lucide-react";

function ProfileContent(): React.ReactElement {
  const { session } = useAuth();

  return (
    <div className="flex min-h-[75vh] items-center justify-center py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cata-red/10">
          <User size={30} className="text-cata-red" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-cata-text">
          Perfil
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-cata-text/65">
          {session?.user.name ? `Hola, ${session.user.name}. ` : ""}
          Esta pantalla está en construcción — pronto podrá ver y editar los
          datos de su cuenta desde acá.
        </p>
      </div>
    </div>
  );
}

export default function ProfilePage(): React.ReactElement {
  return (
    <ProtectedRoute
      allowedRoles={["admin", "trainer", "representante", "estudiante"]}
    >
      <ProfileContent />
    </ProtectedRoute>
  );
}
