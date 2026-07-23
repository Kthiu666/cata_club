/**
 * GET /api/personas/reportes/pdf — proxy to FastAPI's GET /personas/reportes/pdf.
 */
import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/auth";
import { backendFetchAuthed } from "@/lib/server/backend-client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const prioridad = searchParams.get("prioridad_municipal");
  const becado = searchParams.get("becado");

  const backendParams = new URLSearchParams();
  if (prioridad === "true" || prioridad === "false") backendParams.set("prioridad_municipal", prioridad);
  if (becado === "true" || becado === "false") backendParams.set("becado", becado);

  const qs = backendParams.toString();
  const result = await backendFetchAuthed(request, `/personas/reportes/pdf${qs ? `?${qs}` : ""}`);

  if (!result.ok) {
    return NextResponse.json({ message: "No se pudo generar el PDF." }, { status: result.status });
  }
  if (!result.response.ok) {
    return NextResponse.json(
      { message: "No se pudo generar el PDF del reporte." },
      { status: result.response.status },
    );
  }

  const pdfBuffer = await result.response.arrayBuffer();
  const response = new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=reporte_personas.pdf",
    },
  });
  if (result.refreshedAccessToken) {
    setAuthCookies(response, { accessToken: result.refreshedAccessToken });
  }
  return response;
}
