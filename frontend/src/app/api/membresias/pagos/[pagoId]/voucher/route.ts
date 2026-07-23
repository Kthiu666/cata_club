/**
 * POST /api/membresias/pagos/[pagoId]/voucher — upload a voucher file for a payment.
 *
 * BFF proxies to FastAPI's:
 *   POST /membresias/pagos/{pago_id}/voucher  (multipart/form-data)
 * Accepts: image/jpeg, image/png, application/pdf. Max 5 MB.
 */

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed, passthroughBackendError } from "@/lib/server/backend-client";

interface RouteContext {
  params: { pagoId: string };
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const pagoId = Number(context.params.pagoId);
  if (Number.isNaN(pagoId)) {
    return NextResponse.json({ message: "El id de pago no es válido." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "El cuerpo de la solicitud no es válido." }, { status: 400 });
  }

  const file = formData.get("archivo") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ message: "El campo 'archivo' es requerido." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { message: `Tipo de archivo no permitido: ${file.type}. Use JPG, PNG o PDF.` },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { message: `El archivo supera el límite de 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).` },
      { status: 400 },
    );
  }

  const backendFormData = new FormData();
  backendFormData.append("archivo", file, file.name);

  const result = await backendFetchAuthed(request, `/membresias/pagos/${pagoId}/voucher`, {
    method: "POST",
    body: backendFormData,
  });

  if (!result.ok) {
    return NextResponse.json({ message: "No se pudo subir el voucher." }, { status: result.status });
  }
  if (!result.response.ok) {
    return passthroughBackendError(result.response, "No se pudo subir el voucher.");
  }

  const data = (await result.response.json()) as Record<string, unknown>;
  const response = NextResponse.json(data, { status: 201 });
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
