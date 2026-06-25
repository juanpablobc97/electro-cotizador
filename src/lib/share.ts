import { COMPANY_EMAIL, COMPANY_NAME, COMPANY_PHONE_DISPLAY } from "./branding";
import type { Client, ServiceSheet } from "./types";
import { SERVICE_TYPE_LABELS, formatDate } from "./utils";

function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return digits;
  return digits;
}

export function buildServiceSheetMessage(
  sheet: ServiceSheet,
  client: Client,
): string {
  const materiales =
    sheet.materiales.length > 0
      ? sheet.materiales
          .map((m) => `• ${m.descripcion} (${m.cantidad} ${m.unidad})`)
          .join("\n")
      : "• Sin materiales registrados";

  return [
    `${COMPANY_NAME}`,
    `Hoja de servicio: ${sheet.numero}`,
    `Fecha: ${formatDate(sheet.fecha)}`,
    ``,
    `Cliente: ${client.nombre}`,
    `Servicio: ${SERVICE_TYPE_LABELS[sheet.tipoServicio]}`,
    `Ubicación: ${sheet.direccionServicio}`,
    ``,
    `Trabajo realizado:`,
    sheet.descripcionTrabajo,
    ``,
    `Materiales utilizados:`,
    materiales,
    ``,
    `Garantía: ${sheet.garantiaMeses} meses a partir de esta fecha.`,
    sheet.notas ? `\nNotas: ${sheet.notas}` : "",
    ``,
    `Comprobante de servicio — conserve este mensaje para sus garantías.`,
    `${COMPANY_PHONE_DISPLAY} · ${COMPANY_EMAIL}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function getWhatsAppShareUrl(phone: string, message: string): string {
  const formatted = formatWhatsAppPhone(phone);
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

export function getEmailShareUrl(
  email: string,
  subject: string,
  body: string,
): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function getServiceSheetEmailSubject(sheet: ServiceSheet): string {
  return `Hoja de servicio ${sheet.numero} — ${COMPANY_NAME}`;
}
