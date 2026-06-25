import { COMPANY_EMAIL, COMPANY_NAME, COMPANY_PHONE_DISPLAY } from "./branding";
import type { Client, Quote, ServiceSheet } from "./types";
import { SERVICE_TYPE_LABELS, calculateQuoteTotals, formatCurrency, formatDate } from "./utils";
import { getEmailShareUrl, getWhatsAppShareUrl } from "./share";

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function sharePdfNative(options: {
  blob: Blob;
  filename: string;
  title: string;
  text: string;
}): Promise<boolean> {
  const file = new File([options.blob], options.filename, { type: "application/pdf" });
  if (typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
    return false;
  }
  try {
    await navigator.share({ files: [file], title: options.title, text: options.text });
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return true;
    return false;
  }
}

export async function sharePdfViaWhatsApp(options: {
  blob: Blob;
  filename: string;
  title: string;
  message: string;
  phone: string;
}): Promise<void> {
  const shared = await sharePdfNative({
    blob: options.blob,
    filename: options.filename,
    title: options.title,
    text: options.message,
  });
  if (shared) return;

  downloadPdf(options.blob, options.filename);
  const hint = "\n\n📎 Se descargó el PDF. En WhatsApp, toca el clip 📎 y adjunta el archivo.";
  window.open(getWhatsAppShareUrl(options.phone, options.message + hint), "_blank");
}

export async function sharePdfViaEmail(options: {
  blob: Blob;
  filename: string;
  title: string;
  message: string;
  email: string;
  subject: string;
}): Promise<void> {
  const shared = await sharePdfNative({
    blob: options.blob,
    filename: options.filename,
    title: options.title,
    text: options.message,
  });
  if (shared) return;

  downloadPdf(options.blob, options.filename);
  const hint =
    "\n\n📎 Se descargó el PDF. Adjunta el archivo en tu correo (icono de clip).";
  window.location.href = getEmailShareUrl(
    options.email,
    options.subject,
    options.message + hint,
  );
}

export function buildQuoteMessage(quote: Quote, client: Client): string {
  const totals = calculateQuoteTotals(quote);
  return [
    `${COMPANY_NAME}`,
    `Cotización: ${quote.numero}`,
    `Fecha: ${formatDate(quote.fecha)}`,
    `Válida por: ${quote.validezDias} días`,
    ``,
    `Cliente: ${client.nombre}`,
    `Total: ${formatCurrency(totals.total)} (IVA incluido)`,
    ``,
    `Adjunto encontrará el PDF con el detalle completo de materiales y mano de obra.`,
    `${COMPANY_PHONE_DISPLAY} · ${COMPANY_EMAIL}`,
  ].join("\n");
}

export function getQuoteEmailSubject(quote: Quote): string {
  return `Cotización ${quote.numero} — ${COMPANY_NAME}`;
}

export {
  buildServiceSheetMessage,
  getServiceSheetEmailSubject,
} from "./share";
