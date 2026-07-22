/**
 * Mock data — pending ranking justificativos awaiting admin review.
 *
 * Unlike the rest of the ranking BFF routes (which proxy a real, confirmed
 * backend contract — see ranking_router.py), there is NO backend endpoint
 * to list pending justificativos: `RankingRepositorio.listar_pendientes()`
 * exists at the repository layer (backend/app/infraestructura/repositorios/
 * ranking_repositorio.py) but is never exposed through ranking_router.py.
 * This mock stands in for that missing listing endpoint — see
 * `fetchJustificativosPendientes` in src/services/api.ts.
 */

import type { Justificativo } from "@/types/domain";

export const MOCK_JUSTIFICATIVOS_PENDIENTES: Justificativo[] = [
  {
    id: 101,
    personaId: 3,
    anio: 2026,
    mes: 6,
    motivo: "Viaje familiar de emergencia",
    archivoUrl: null,
    observaciones: null,
    estado: "PENDIENTE",
    motivoRechazo: null,
    fechaSolicitud: "2026-07-05T14:30:00Z",
    fechaEvaluacion: null,
    evaluadoPorId: null,
  },
  {
    id: 102,
    personaId: 7,
    anio: 2026,
    mes: 6,
    motivo: "Certificado médico adjunto por lesión",
    archivoUrl: "https://example.com/certificados/102.pdf",
    observaciones: "Se adjunta copia del certificado original",
    estado: "PENDIENTE",
    motivoRechazo: null,
    fechaSolicitud: "2026-07-08T09:15:00Z",
    fechaEvaluacion: null,
    evaluadoPorId: null,
  },
];
