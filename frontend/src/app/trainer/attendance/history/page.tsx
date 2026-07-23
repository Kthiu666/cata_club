import { redirect } from "next/navigation";

/**
 * El historial de asistencias se integró en el dashboard del entrenador
 * (`/trainer`), debajo de las estadísticas. Esta ruta ahora redirige para
 * no romper bookmarks ni enlaces indexados.
 */
export default function HistoryPage(): never {
  redirect("/trainer");
}
