import { describe, expect, it } from "vitest";
import {
  filterPagosByStatus,
  sortPagosByDate,
  formatPagoMonto,
  getEmptyStateMessage,
  type PagoStatusFilter,
} from "../payments-utils";
import type { PagoPersona } from "@/services/api";

function makePago(overrides: Partial<PagoPersona> = {}): PagoPersona {
  return {
    id: 1,
    monto: "35.00",
    motivoRechazo: null,
    estadoPago: "PENDIENTE_VALIDACION",
    tipoPago: "TRANSFERENCIA",
    fechaRegistro: "2026-07-01T10:00:00",
    fechaValidacion: null,
    fechaInicio: "2026-07-01",
    fechaFin: "2026-07-31",
    personaId: 1,
    membresiaId: 1,
    voucherUrl: null,
    voucherFormato: null,
    ...overrides,
  };
}

describe("filterPagosByStatus", () => {
  const pagos = [
    makePago({ id: 1, estadoPago: "APROBADO" }),
    makePago({ id: 2, estadoPago: "PENDIENTE_VALIDACION" }),
    makePago({ id: 3, estadoPago: "RECHAZADO" }),
    makePago({ id: 4, estadoPago: "APROBADO" }),
  ];

  it("returns all when filter is TODOS", () => {
    expect(filterPagosByStatus(pagos, "TODOS")).toHaveLength(4);
  });

  it("filters APROBADO", () => {
    const result = filterPagosByStatus(pagos, "APROBADO");
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.estadoPago === "APROBADO")).toBe(true);
  });

  it("filters PENDIENTE_VALIDACION", () => {
    const result = filterPagosByStatus(pagos, "PENDIENTE_VALIDACION");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("filters RECHAZADO", () => {
    const result = filterPagosByStatus(pagos, "RECHAZADO");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it("returns empty array when no match", () => {
    const result = filterPagosByStatus([], "APROBADO");
    expect(result).toHaveLength(0);
  });
});

describe("sortPagosByDate", () => {
  it("sorts newest first by fechaRegistro", () => {
    const pagos = [
      makePago({ id: 1, fechaRegistro: "2026-06-01T10:00:00" }),
      makePago({ id: 2, fechaRegistro: "2026-07-15T10:00:00" }),
      makePago({ id: 3, fechaRegistro: "2026-07-01T10:00:00" }),
    ];
    const sorted = sortPagosByDate(pagos);
    expect(sorted.map((p) => p.id)).toEqual([2, 3, 1]);
  });

  it("does not mutate the original array", () => {
    const pagos = [
      makePago({ id: 1, fechaRegistro: "2026-06-01T10:00:00" }),
      makePago({ id: 2, fechaRegistro: "2026-07-15T10:00:00" }),
    ];
    sortPagosByDate(pagos);
    expect(pagos[0].id).toBe(1);
  });
});

describe("formatPagoMonto", () => {
  it("prepends $ to the amount string", () => {
    expect(formatPagoMonto("35.00")).toBe("$35.00");
  });
});

describe("getEmptyStateMessage", () => {
  const cases: [PagoStatusFilter, string][] = [
    ["TODOS", "Todavía no hay pagos registrados."],
    ["APROBADO", "No hay pagos aprobados."],
    ["RECHAZADO", "No hay pagos rechazados."],
    ["PENDIENTE_VALIDACION", "No hay pagos pendientes de validación."],
  ];

  it.each(cases)("returns correct message for %s", (filter, expected) => {
    expect(getEmptyStateMessage(filter)).toBe(expected);
  });
});
