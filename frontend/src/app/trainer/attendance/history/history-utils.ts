export type DateRangePreset = "today" | "this_week" | "this_month" | "custom";

export function buildDateRange(preset: DateRangePreset): { fechaInicio: string; fechaFin: string } {
  const today = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  switch (preset) {
    case "today":
      return { fechaInicio: toISO(today), fechaFin: toISO(today) };
    case "this_week": {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { fechaInicio: toISO(start), fechaFin: toISO(today) };
    }
    case "this_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { fechaInicio: toISO(start), fechaFin: toISO(today) };
    }
    case "custom":
      return { fechaInicio: "", fechaFin: "" };
  }
}

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENTE: "Presente",
  AUSENTE: "Ausente",
  TARDANZA: "Tardanza",
  JUSTIFICADO: "Justificado",
};

export function attendanceStatusBadgeClass(estado: string): string {
  switch (estado) {
    case "PRESENTE":
      return "bg-green-100 text-green-800";
    case "AUSENTE":
      return "bg-red-100 text-red-800";
    case "TARDANZA":
      return "bg-yellow-100 text-yellow-800";
    case "JUSTIFICADO":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
