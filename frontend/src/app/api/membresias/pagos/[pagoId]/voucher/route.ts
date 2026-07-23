/**
 * POST /api/membresias/pagos/[pagoId]/voucher — subir comprobante de pago.
 */
import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed } from "@/lib/server/backend-client";

interface RouteContext {
  params: { pagoId: string };
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const pagoId = Number(context.params.pagoId);
  if (Number.isNaN(pagoId)) {
    return NextResponse.json({ message: "ID de pago inválido." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "El cuerpo no es un formulario válido." }, { status: 400 });
  }

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ message: "Debe adjuntar un archivo." }, { status: 400 });
  }

  const backendForm = new FormData();
  backendForm.append("archivo", archivo, archivo.name);

  const result = await backendFetchAuthed(request, `/membresias/pagos/${pagoId}/voucher`, {
    method: "POST",
    body: backendForm,
  });

  if (!result.ok) {
    return NextResponse.json({ message: "No se pudo subir el comprobante." }, { status: result.status });
  }
  if (!result.response.ok) {
    const text = await result.response.text();
    return NextResponse.json(
      { message: text || "No se pudo subir el comprobante." },
      { status: result.response.status },
    );
  }

  const data = await result.response.json();
  const response = NextResponse.json(data, { status: 201 });
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
