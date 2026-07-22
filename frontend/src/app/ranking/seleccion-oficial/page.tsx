/**
 * Selección Oficial — admin-managed roster page (Ranking track).
 *
 * Dedicated route (PR9), extracted from an anchor-jump section that used to
 * live inside `groups/page.tsx` (`#seleccion-oficial`). The app owner
 * live-tested the smooth-scroll fix and said it still felt like an abrupt
 * context switch, so it now gets its own dedicated screen instead.
 *
 * Thin wrapper that renders the shared `SeleccionOficialPanel`.
 */
"use client";

import SeleccionOficialPanel from "@/components/seleccion-oficial/SeleccionOficialPanel";

export default function SeleccionOficialPage(): React.ReactElement {
  return <SeleccionOficialPanel />;
}
