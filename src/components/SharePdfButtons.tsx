"use client";

import { useState } from "react";
import { downloadPdf, sharePdfViaEmail, sharePdfViaWhatsApp } from "@/lib/share-pdf";
import { Button } from "@/components/ui/Button";

type SharePdfButtonsProps = {
  getPdf: () => Promise<{ blob: Blob; filename: string }>;
  title: string;
  message: string;
  subject: string;
  clientPhone: string;
  clientEmail?: string;
};

export function SharePdfButtons({
  getPdf,
  title,
  message,
  subject,
  clientPhone,
  clientEmail,
}: SharePdfButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function run(action: "download" | "whatsapp" | "email") {
    setLoading(action);
    try {
      const { blob, filename } = await getPdf();
      if (action === "download") {
        downloadPdf(blob, filename);
        return;
      }
      if (action === "whatsapp") {
        await sharePdfViaWhatsApp({
          blob,
          filename,
          title,
          message,
          phone: clientPhone,
        });
        return;
      }
      if (!clientEmail) {
        alert("Este cliente no tiene correo registrado. Agrégalo en su ficha de cliente.");
        return;
      }
      await sharePdfViaEmail({
        blob,
        filename,
        title,
        message,
        email: clientEmail,
        subject,
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button onClick={() => run("download")} disabled={!!loading}>
          {loading === "download" ? "Generando..." : "Descargar PDF"}
        </Button>
        <Button variant="secondary" onClick={() => run("whatsapp")} disabled={!!loading}>
          {loading === "whatsapp" ? "Preparando..." : "Enviar PDF por WhatsApp"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => run("email")}
          disabled={!!loading}
          className="sm:col-span-2"
        >
          {loading === "email" ? "Preparando..." : "Enviar PDF por correo"}
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        En iPad o iPhone se abrirá el menú de compartir con el PDF adjunto. Elige WhatsApp o
        Correo. Si no aparece, el PDF se descarga y se abre WhatsApp o el correo para que lo
        adjuntes manualmente.
      </p>
    </div>
  );
}
