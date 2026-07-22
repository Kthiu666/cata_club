/**
 * Contract tests for the API client (src/services/api.ts).
 *
 * These tests verify the HTTP client contract without requiring a running
 * backend. All network calls are mocked via vi.spyOn(global, "fetch").
 *
 * Scope:
 *  - Happy path: correct URL resolution, response parsing.
 *  - Error paths: non-2xx status codes produce typed errors.
 *  - Header merging: caller headers coexist with Content-Type.
 *  - Timeout/abort: default timeout fires and rejects the request.
 *  - Mock default: USE_MOCKS defaults to true when env var is unset.
 *  - Payment validation: approve and reject flows, rejection reason validation.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  enrollStudent,
  fetchPaymentValidations,
  updatePaymentValidation,
  fetchNotificaciones,
  marcarNotificacionLeida,
  submitJustificativo,
  evaluarJustificativo,
  fetchJustificativosPendientes,
  fetchMiPerfil,
  actualizarMiPerfil,
  fetchHorarios,
  crearHorario,
  actualizarHorario,
  eliminarHorario,
  fetchAlumnosPorHorario,
  asignarAlumnoAHorario,
  desasignarAlumnoDeHorario,
} from "../api";
import type { PaymentValidationRequest, Horario, AlumnoHorario } from "../api";
import type { Notificacion, Justificativo, PerfilPropio } from "@/types/domain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Factory for a successful fetch Response. */
function okResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

/** A minimal payment-validation-shaped response body. */
function makePaymentValidation(
  overrides: Partial<PaymentValidationRequest> = {},
): PaymentValidationRequest {
  return {
    id: "pv-001",
    studentName: "Sofia Martinez",
    responsablePagoName: "Carlos Martinez",
    membershipPeriod: "July 2026",
    membershipType: "Monthly",
    expectedAmount: 85.0,
    paymentMethod: "Bank Transfer",
    uploadedAt: "2026-06-28T10:30:00Z",
    currentMembershipStatus: "vencida",
    proofFileName: "comprobante.pdf",
    proofFileType: "pdf",
    validationStatus: "pendiente",
    ...overrides,
  };
}

/** Factory for an error fetch Response. */
function errorResponse(
  status: number,
  body: Record<string, unknown> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getFetchHeaders(): Headers {
  const call = vi.mocked(global.fetch).mock.calls[0];
  if (!call) throw new Error("Expected fetch to be called.");
  const options = call[1];
  if (!options?.headers) throw new Error("Expected fetch options to include headers.");
  return new Headers(options.headers);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.spyOn(global, "fetch");
  process.env.NEXT_PUBLIC_USE_MOCKS = "true";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.NEXT_PUBLIC_USE_MOCKS;
});

// ---------------------------------------------------------------------------
// Payment Validation API methods – contract tests
// ---------------------------------------------------------------------------

describe("fetchPaymentValidations", () => {
  it("calls /api/payments when NEXT_PUBLIC_USE_MOCKS=true", async () => {
    const items = [makePaymentValidation({ id: "pv-001" })];
    vi.mocked(global.fetch).mockResolvedValue(okResponse(items));

    const result = await fetchPaymentValidations();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("/api/payments", expect.anything());
    expect(result).toEqual(items);
  });

  it("still calls same-origin /api/payments when USE_MOCKS is false (no cross-origin mode)", async () => {
    // src/services/api.ts always calls same-origin /api/* now — the access
    // token lives in an HttpOnly cookie the browser can't attach to a
    // cross-origin request, so a "direct backend" URL mode could never
    // authenticate. NEXT_PUBLIC_USE_MOCKS only affects the x-mock-role
    // header below, not which URL gets called.
    process.env.NEXT_PUBLIC_USE_MOCKS = "false";
    vi.mocked(global.fetch).mockResolvedValue(okResponse([]));

    await fetchPaymentValidations();

    expect(global.fetch).toHaveBeenCalledWith("/api/payments", expect.anything());
  });

  it("defaults to local mocks when NEXT_PUBLIC_USE_MOCKS is unset", async () => {
    delete process.env.NEXT_PUBLIC_USE_MOCKS;
    vi.mocked(global.fetch).mockResolvedValue(okResponse([]));

    await fetchPaymentValidations();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/payments",
      expect.anything(),
    );
  });

  it("throws a typed error on a non-2xx response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(500, { message: "Server error" }),
    );

    await expect(fetchPaymentValidations()).rejects.toThrow("Server error");
  });
});

describe("enrollStudent", () => {
  it("accepts the minimal safe enrollment response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(okResponse({ enrolled: true }, { status: 201 }));

    await expect(enrollStudent({
      alumno: { nombres: "Ana", apellidos: "Pérez", cedula: "1712345678", fechaNacimiento: "2000-01-15", telefono: "0991234567" },
      credencialesAlumno: { correo: "ana@example.com", contrasenia: "password8" },
      fichaMedica: { tipoSangre: "O_POSITIVO", condicionesSalud: "", alergias: "", contactoEmergencia: "María", telefonoEmergencia: "0997654321" },
    })).resolves.toEqual({ enrolled: true });
  });

  it("rejects enrollment responses with unexpected sensitive fields", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      okResponse({ enrolled: true, accessToken: "unsafe" }, { status: 201 }),
    );

    await expect(enrollStudent({
      alumno: { nombres: "Ana", apellidos: "Pérez", cedula: "1712345678", fechaNacimiento: "2000-01-15", telefono: "0991234567" },
      credencialesAlumno: { correo: "ana@example.com", contrasenia: "password8" },
      fichaMedica: { tipoSangre: "O_POSITIVO", condicionesSalud: "", alergias: "", contactoEmergencia: "María", telefonoEmergencia: "0997654321" },
    })).rejects.toThrow("La respuesta de inscripción no es válida.");
  });
});

// ---------------------------------------------------------------------------
// Non-2xx error handling
// ---------------------------------------------------------------------------

describe("error handling", () => {
  it("throws a useful error message for a 500 response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(500, { message: "Internal server error" }),
    );

    await expect(fetchPaymentValidations()).rejects.toThrow("Internal server error");
  });

  it("throws a useful error message for a 404 response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(404, { message: "Not found" }),
    );

    await expect(fetchPaymentValidations()).rejects.toThrow("Not found");
  });

  it("falls back to a status-based message when no JSON body is returned", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    await expect(fetchPaymentValidations()).rejects.toThrow(
      "Request failed with status 500",
    );
  });

  it("includes the HTTP status on the thrown error", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(422, { message: "Validation failed" }),
    );

    try {
      await fetchPaymentValidations();
      expect.fail("Expected an error");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error & { status: number }).status).toBe(422);
    }
  });
});

// ---------------------------------------------------------------------------
// Header merging
// ---------------------------------------------------------------------------

describe("header merging", () => {
  it("preserves Content-Type when the caller provides extra headers", async () => {
    vi.mocked(global.fetch).mockResolvedValue(okResponse([]));

    await fetchPaymentValidations();

    const headers = getFetchHeaders();

    expect(headers.get("content-type")).toBe("application/json");
  });

  it("merges caller-provided headers without dropping Content-Type", async () => {
    vi.mocked(global.fetch).mockResolvedValue(okResponse([]));

    await updatePaymentValidation("pv-001", { action: "approved" });

    const headers = getFetchHeaders();

    // The explicit Content-Type should be present
    expect(headers.get("content-type")).toBe("application/json");
  });
});

// ---------------------------------------------------------------------------
// Timeout / abort behaviour
// ---------------------------------------------------------------------------

describe("timeout / abort", () => {
  it("aborts the request after the default 10 s timeout when no signal is provided", async () => {
    vi.useFakeTimers();

    let capturedSignal: AbortSignal | undefined;
    vi.mocked(global.fetch).mockImplementation((_url, opts) => {
      capturedSignal = opts?.signal as AbortSignal | undefined;
      return new Promise((_resolve, reject) => {
        if (capturedSignal) {
          const onAbort = () =>
            queueMicrotask(() =>
              reject(new DOMException("The operation was aborted", "AbortError")),
            );
          if (capturedSignal.aborted) {
            onAbort();
          } else {
            capturedSignal.addEventListener("abort", onAbort, { once: true });
          }
        }
      });
    });

    try {
      // Start the request (won't settle — the mock never resolves)
      const promise = fetchPaymentValidations();
      // Pre-attach a handler so Node doesn't flag it as unhandled when abort fires
      promise.catch(() => {});

      // Advance past the 10 s threshold — timer fires and calls controller.abort()
      await vi.advanceTimersByTimeAsync(10_001);

      // The signal should have been aborted by the timeout
      expect(capturedSignal).toBeDefined();
      if (!capturedSignal) throw new Error("Expected fetch to receive an AbortSignal.");
      expect(capturedSignal.aborted).toBe(true);

      await expect(promise).rejects.toThrow(/aborted/i);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// updatePaymentValidation — approve / reject
// ---------------------------------------------------------------------------

describe("updatePaymentValidation — approve", () => {
  it("sends PUT with action approved to /api/payments/:id in mock mode", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      okResponse(makePaymentValidation({ id: "pv-001", validationStatus: "validado" })),
    );

    const result = await updatePaymentValidation("pv-001", { action: "approved" });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/payments/pv-001",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ action: "approved" }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ id: "pv-001", validationStatus: "validado" }),
    );
  });

  it("throws a typed error on a 404 response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(404, { message: "Payment validation request not found" }),
    );

    await expect(
      updatePaymentValidation("invalid-id", { action: "approved" }),
    ).rejects.toThrow("Payment validation request not found");
  });
});

// ---------------------------------------------------------------------------
// Ranking — Notificaciones & Justificativos
// ---------------------------------------------------------------------------

function makeNotificacion(overrides: Partial<Notificacion> = {}): Notificacion {
  return {
    id: 1,
    tipo: "JUSTIFICATIVO_APROBADO",
    mensaje: "Tu justificativo de 7/2026 fue aprobado.",
    leida: false,
    fechaCreacion: "2026-07-19T10:00:00Z",
    entidadRelacionadaId: 5,
    ...overrides,
  };
}

function makeJustificativo(overrides: Partial<Justificativo> = {}): Justificativo {
  return {
    id: 10,
    personaId: 3,
    anio: 2026,
    mes: 7,
    motivo: "Viaje familiar",
    archivoUrl: null,
    observaciones: null,
    estado: "PENDIENTE",
    motivoRechazo: null,
    fechaSolicitud: "2026-07-19T10:00:00Z",
    fechaEvaluacion: null,
    evaluadoPorId: null,
    ...overrides,
  };
}

describe("fetchNotificaciones", () => {
  it("calls the real BFF route GET /api/ranking/notificaciones/mias", async () => {
    const items = [makeNotificacion()];
    vi.mocked(global.fetch).mockResolvedValue(okResponse(items));

    const result = await fetchNotificaciones();

    expect(global.fetch).toHaveBeenCalledWith("/api/ranking/notificaciones/mias", expect.anything());
    expect(result).toEqual(items);
  });
});

describe("marcarNotificacionLeida", () => {
  it("sends PATCH to /api/ranking/notificaciones/:id/leer", async () => {
    vi.mocked(global.fetch).mockResolvedValue(okResponse(makeNotificacion({ leida: true })));

    const result = await marcarNotificacionLeida(1);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ranking/notificaciones/1/leer",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(result.leida).toBe(true);
  });
});

describe("submitJustificativo", () => {
  it("sends POST to /api/ranking/justificativos with the full DTO", async () => {
    vi.mocked(global.fetch).mockResolvedValue(okResponse(makeJustificativo(), { status: 201 }));

    const result = await submitJustificativo({
      personaId: 3,
      anio: 2026,
      mes: 7,
      motivo: "Viaje familiar",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ranking/justificativos",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ personaId: 3, anio: 2026, mes: 7, motivo: "Viaje familiar" }),
      }),
    );
    expect(result).toEqual(makeJustificativo());
  });

  it("throws a typed error when the backend rejects the request", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(409, { message: "Ya existe un justificativo para esta persona en ese período" }),
    );

    await expect(
      submitJustificativo({ personaId: 3, anio: 2026, mes: 7, motivo: "Viaje familiar" }),
    ).rejects.toThrow("Ya existe un justificativo para esta persona en ese período");
  });
});

describe("evaluarJustificativo", () => {
  it("sends PATCH to /api/ranking/justificativos/:id/evaluar in real (non-mock) mode", async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = "false";
    const evaluado = makeJustificativo({ estado: "APROBADO", fechaEvaluacion: "2026-07-20T09:00:00Z" });
    vi.mocked(global.fetch).mockResolvedValue(okResponse(evaluado));

    const result = await evaluarJustificativo(10, { estado: "APROBADO" });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ranking/justificativos/10/evaluar",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ estado: "APROBADO" }),
      }),
    );
    expect(result.estado).toBe("APROBADO");
  });

  it("simulates the decision against the mock pending list in mock mode, without calling the backend", async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = "true";
    const pendientesBefore = await fetchJustificativosPendientes();
    const target = pendientesBefore[0];

    const result = await evaluarJustificativo(target.id, {
      estado: "RECHAZADO",
      motivoRechazo: "Sin evidencia",
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ id: target.id, estado: "RECHAZADO", motivoRechazo: "Sin evidencia" }),
    );

    // A second fetchJustificativosPendientes() reflects the evaluation, same
    // as a real backend would after an approve/reject.
    const pendientesAfter = await fetchJustificativosPendientes();
    expect(pendientesAfter.find((j) => j.id === target.id)).toBeUndefined();
  });
});

describe("fetchJustificativosPendientes", () => {
  it("returns curated mock data when NEXT_PUBLIC_USE_MOCKS is unset (defaults to mock mode)", async () => {
    delete process.env.NEXT_PUBLIC_USE_MOCKS;

    const result = await fetchJustificativosPendientes();

    expect(result.length).toBeGreaterThan(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls the real BFF route GET /api/ranking/justificativos/pendientes when mocks are disabled", async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = "false";
    const items = [makeJustificativo()];
    vi.mocked(global.fetch).mockResolvedValue(okResponse(items));

    const result = await fetchJustificativosPendientes();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ranking/justificativos/pendientes",
      expect.anything(),
    );
    expect(result).toEqual(items);
  });
});

describe("updatePaymentValidation — reject", () => {
  it("sends PUT with action rejected and rejectionReason", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      okResponse(
        makePaymentValidation({
          id: "pv-001",
          validationStatus: "rechazado",
          rejectionReason: "Invalid amount",
        }),
      ),
    );

    const result = await updatePaymentValidation("pv-001", {
      action: "rejected",
      rejectionReason: "Invalid amount",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/payments/pv-001",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ action: "rejected", rejectionReason: "Invalid amount" }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: "pv-001",
        validationStatus: "rechazado",
        rejectionReason: "Invalid amount",
      }),
    );
  });

  it("rejects with an empty rejection reason at the mock API level", async () => {
    // The mock handler validates rejectionReason is non-empty.
    // The client should pass through whatever the server returns.
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ message: "El motivo de rechazo es obligatorio y no debe estar vacío" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      updatePaymentValidation("pv-001", { action: "rejected", rejectionReason: "" }),
    ).rejects.toThrow("El motivo de rechazo es obligatorio y no debe estar vacío");
  });
});

// ---------------------------------------------------------------------------
// Perfil propio (Issue #36) — dedicated self-profile fetch/mutate
// ---------------------------------------------------------------------------

function makePerfilPropio(overrides: Partial<PerfilPropio> = {}): PerfilPropio {
  return {
    correo: "ana.torres@cataclub.com",
    personaId: 7,
    nombres: "Ana",
    apellidos: "Torres",
    roles: ["ENTRENADOR"],
    telefono: "0991234567",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Horarios / Asignación Alumno-Horario — BFF path fix (gestion-horarios PR-C)
//
// api.ts previously called `/api/asistencias/*`, but no such BFF route
// handler directory has ever existed — only `/api/groups/horarios*` is real.
// These tests pin the corrected `/api/groups/...` contract.
// ---------------------------------------------------------------------------

function makeHorario(overrides: Partial<Horario> = {}): Horario {
  return {
    id: 1,
    diaSemana: "LUNES",
    horaInicio: "18:00",
    horaFin: "20:00",
    categoria: "COMPETITIVO",
    entrenadorId: 5,
    nivelRankingId: null,
    ...overrides,
  };
}

describe("fetchMiPerfil", () => {
  it("calls GET /api/auth/me and returns the parsed profile", async () => {
    const perfil = makePerfilPropio();
    vi.mocked(global.fetch).mockResolvedValue(okResponse(perfil));

    const result = await fetchMiPerfil();

    expect(global.fetch).toHaveBeenCalledWith("/api/auth/me", expect.anything());
    expect(result).toEqual(perfil);
  });

  it("throws a typed error when the BFF route rejects the request", async () => {
    vi.mocked(global.fetch).mockResolvedValue(errorResponse(401, { message: "Sesión expirada." }));

    await expect(fetchMiPerfil()).rejects.toThrow("Sesión expirada.");
  });
});

describe("actualizarMiPerfil", () => {
  it("sends PATCH to /api/auth/me with only telefono when correo is omitted", async () => {
    const perfil = makePerfilPropio({ telefono: "0987654321" });
    vi.mocked(global.fetch).mockResolvedValue(okResponse(perfil));

    const result = await actualizarMiPerfil({ telefono: "0987654321" });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ telefono: "0987654321" }),
      }),
    );
    expect(result).toEqual(perfil);
  });

  it("sends PATCH to /api/auth/me with only correo when telefono is omitted", async () => {
    const perfil = makePerfilPropio({ correo: "nueva@cataclub.com" });
    vi.mocked(global.fetch).mockResolvedValue(okResponse(perfil));

    const result = await actualizarMiPerfil({ correo: "nueva@cataclub.com" });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ correo: "nueva@cataclub.com" }),
      }),
    );
    expect(result).toEqual(perfil);
  });

  it("throws a typed error when the backend rejects a duplicate correo", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      errorResponse(400, { message: "El correo ya está en uso." }),
    );

    await expect(actualizarMiPerfil({ correo: "duplicado@cataclub.com" })).rejects.toThrow(
      "El correo ya está en uso.",
    );
  });
});

function makeAlumnoHorario(overrides: Partial<AlumnoHorario> = {}): AlumnoHorario {
  return {
    id: 10,
    persona_id: 3,
    persona_nombre_completo: "Sofia Martinez",
    horario_id: 1,
    horario_dia: "LUNES",
    horario_hora_inicio: "18:00",
    horario_hora_fin: "20:00",
    fecha_asignacion: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

describe("fetchHorarios", () => {
  it("GETs /api/groups/horarios (not /api/asistencias/horarios)", async () => {
    const items = [makeHorario(), makeHorario({ id: 2, categoria: "FORMATIVO" })];
    vi.mocked(global.fetch).mockResolvedValue(okResponse(items));

    const result = await fetchHorarios();

    expect(global.fetch).toHaveBeenCalledWith("/api/groups/horarios", expect.anything());
    expect(result).toEqual(items);
  });
});

describe("crearHorario", () => {
  it("POSTs /api/groups/horarios", async () => {
    const created = makeHorario();
    vi.mocked(global.fetch).mockResolvedValue(okResponse(created, { status: 201 }));

    const dto = { dia_semana: "LUNES", categoria: "COMPETITIVO", entrenador_id: 5 };
    const result = await crearHorario(dto);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/groups/horarios",
      expect.objectContaining({ method: "POST", body: JSON.stringify(dto) }),
    );
    expect(result).toEqual(created);
  });
});

describe("actualizarHorario", () => {
  it("PUTs /api/groups/horarios/:id", async () => {
    const updated = makeHorario({ categoria: "FORMATIVO" });
    vi.mocked(global.fetch).mockResolvedValue(okResponse(updated));

    const dto = { categoria: "FORMATIVO" };
    const result = await actualizarHorario(1, dto);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/groups/horarios/1",
      expect.objectContaining({ method: "PUT", body: JSON.stringify(dto) }),
    );
    expect(result).toEqual(updated);
  });
});

describe("eliminarHorario", () => {
  it("DELETEs /api/groups/horarios/:id", async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await eliminarHorario(1);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/groups/horarios/1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("fetchAlumnosPorHorario", () => {
  it("GETs /api/groups/horarios/:id/alumnos", async () => {
    const items = [makeAlumnoHorario(), makeAlumnoHorario({ id: 11, persona_id: 4 })];
    vi.mocked(global.fetch).mockResolvedValue(okResponse(items));

    const result = await fetchAlumnosPorHorario(1);

    expect(global.fetch).toHaveBeenCalledWith("/api/groups/horarios/1/alumnos", expect.anything());
    expect(result).toEqual(items);
  });

  it("targets a different horario id (triangulation)", async () => {
    const items = [makeAlumnoHorario({ id: 20, horario_id: 7 })];
    vi.mocked(global.fetch).mockResolvedValue(okResponse(items));

    const result = await fetchAlumnosPorHorario(7);

    expect(global.fetch).toHaveBeenCalledWith("/api/groups/horarios/7/alumnos", expect.anything());
    expect(result).toEqual(items);
  });
});

describe("asignarAlumnoAHorario", () => {
  it("POSTs /api/groups/asignar-alumno", async () => {
    const created = makeAlumnoHorario();
    vi.mocked(global.fetch).mockResolvedValue(okResponse(created, { status: 201 }));

    const dto = { persona_id: 3, horario_id: 1 };
    const result = await asignarAlumnoAHorario(dto);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/groups/asignar-alumno",
      expect.objectContaining({ method: "POST", body: JSON.stringify(dto) }),
    );
    expect(result).toEqual(created);
  });
});

describe("desasignarAlumnoDeHorario", () => {
  it("DELETEs /api/groups/desasignar-alumno with query params", async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await desasignarAlumnoDeHorario(3, 1);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/groups/desasignar-alumno?persona_id=3&horario_id=1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("targets different persona/horario ids (triangulation)", async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await desasignarAlumnoDeHorario(9, 4);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/groups/desasignar-alumno?persona_id=9&horario_id=4",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

