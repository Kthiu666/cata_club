/**
 * Proof Preview — Displays the attached payment proof file.
 */

"use client";

import { Paperclip, FileText, Hash, Eye } from "lucide-react";
import type { PaymentValidationRequest } from "@/services/api";

interface ProofPreviewProps {
  request: PaymentValidationRequest;
}

export default function ProofPreview({ request }: ProofPreviewProps) {
  return (
    <div className="card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-cata-charcoal">
        <Paperclip size={16} strokeWidth={1.5} aria-hidden="true" />
        Comprobante de Pago
      </h2>

      <div className="mb-4 rounded-xl border-2 border-dashed border-cata-stone/70 bg-cata-warm/50 p-6 text-center">
        {request.proofPreviewUrl ? (
          <div className="relative mx-auto mb-3 h-48 w-full overflow-hidden rounded-lg bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={request.proofPreviewUrl}
              alt="Vista previa del comprobante de pago"
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="mb-3 flex items-center justify-center">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full ${
                request.proofFileType === "pdf"
                  ? "bg-cata-red/8"
                  : "bg-cata-warm"
              }`}
            >
              <FileText
                size={28}
                strokeWidth={1.5}
                className={request.proofFileType === "pdf" ? "text-cata-red" : "text-cata-gray"}
                aria-hidden="true"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <Hash size={12} strokeWidth={1.5} className="text-cata-gray" aria-hidden="true" />
          <span className="text-sm font-medium text-cata-charcoal">
            {request.proofFileName}
          </span>
        </div>
        <p className="mt-1 text-xs text-cata-gray">
          {request.proofFileType === "pdf" ? "Documento PDF" : "Archivo de imagen"}
        </p>

        <p className="mt-4 text-xs text-cata-gray/60">
          <Eye size={12} strokeWidth={1.5} className="inline-block -mt-0.5 mr-1" aria-hidden="true" />
          Vista previa del comprobante completo no disponible en modo demo.
        </p>
      </div>
    </div>
  );
}
