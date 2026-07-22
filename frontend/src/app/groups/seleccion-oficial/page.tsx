/**
 * Selección Oficial — admin-managed roster page (Groups track).
 *
 * Thin wrapper that renders the shared `SeleccionOficialPanel` with the
 * Groups-track eyebrow/title.
 */
"use client";

import SeleccionOficialPanel from "@/components/seleccion-oficial/SeleccionOficialPanel";

export default function SeleccionOficialPage(): React.ReactElement {
  return <SeleccionOficialPanel />;
}
