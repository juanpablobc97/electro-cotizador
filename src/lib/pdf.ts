import {
  COMPANY_ADDRESS,
  COMPANY_EMAIL,
  COMPANY_LEGAL_NAME,
  COMPANY_NAME,
  COMPANY_PHONE_DISPLAY,
  COMPANY_RFC,
  LOGO_PATH,
} from "./branding";
import type { Client, Quote, ServiceSheet, Survey } from "./types";
import { SERVICE_TYPE_LABELS, calculateQuoteTotals, formatCurrency, formatDate } from "./utils";

const NAVY_RGB: [number, number, number] = [26, 37, 64];
const GOLD_RGB: [number, number, number] = [240, 180, 41];

async function loadLogoDataUrl(): Promise<string> {
  const response = await fetch(LOGO_PATH);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const PDF_MARGIN = 14;
const PDF_PAGE_WIDTH = 210;
const PDF_RIGHT_EDGE = PDF_PAGE_WIDTH - PDF_MARGIN;
const PDF_HEADER_SPLIT_X = 112;
const PDF_FOOTER_HEIGHT = 22;
const PDF_FOOTER_GAP = 6;

function getPdfMaxContentY(doc: import("jspdf").jsPDF): number {
  return doc.internal.pageSize.height - PDF_FOOTER_HEIGHT - PDF_FOOTER_GAP;
}

function ensurePdfSpace(doc: import("jspdf").jsPDF, y: number, needed: number): number {
  if (y + needed <= getPdfMaxContentY(doc)) return y;
  doc.addPage();
  return PDF_MARGIN;
}

function drawPdfHeaderBackground(doc: import("jspdf").jsPDF, height: number) {
  doc.setFillColor(...NAVY_RGB);
  doc.rect(0, 0, PDF_PAGE_WIDTH, height, "F");
}

function measureCompanyBlockHeight(doc: import("jspdf").jsPDF): number {
  const logoSize = 26;
  const textX = PDF_MARGIN + logoSize + 3;
  const maxWidth = PDF_HEADER_SPLIT_X - textX - 4;
  const addressLines = doc.splitTextToSize(COMPANY_ADDRESS, maxWidth);
  return 3 + 4.5 + 4.5 + 4.5 + addressLines.length * 4 + 1 + 4 + 4 + 3;
}

function drawCompanyBlockLeft(doc: import("jspdf").jsPDF, logoDataUrl: string, startY: number) {
  const logoSize = 26;
  const textX = PDF_MARGIN + logoSize + 3;
  const maxWidth = PDF_HEADER_SPLIT_X - textX - 4;
  let lineY = startY + 3;

  doc.addImage(logoDataUrl, "JPEG", PDF_MARGIN, startY, logoSize, logoSize);

  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text(COMPANY_LEGAL_NAME, textX, lineY, { maxWidth });
  lineY += 4.5;
  doc.text(`RFC: ${COMPANY_RFC}`, textX, lineY, { maxWidth });
  lineY += 4.5;
  doc.text(COMPANY_NAME, textX, lineY, { maxWidth });
  lineY += 4.5;

  const addressLines = doc.splitTextToSize(COMPANY_ADDRESS, maxWidth);
  doc.text(addressLines, textX, lineY);
  lineY += addressLines.length * 4 + 1;

  doc.text(`Tel: ${COMPANY_PHONE_DISPLAY}`, textX, lineY, { maxWidth });
  lineY += 4;
  doc.text(COMPANY_EMAIL, textX, lineY, { maxWidth });
}

function drawPdfHeader(
  doc: import("jspdf").jsPDF,
  logoDataUrl: string,
  title: string,
  subtitle: string,
  rightLines: string[],
): number {
  const startY = 10;
  const leftBlockHeight = measureCompanyBlockHeight(doc);
  const rightBlockHeight = 19 + rightLines.length * 6 + 6;
  const headerHeight = Math.max(50, startY + Math.max(leftBlockHeight, rightBlockHeight) + 4);

  drawPdfHeaderBackground(doc, headerHeight);
  drawCompanyBlockLeft(doc, logoDataUrl, startY);

  doc.setTextColor(240, 180, 41);
  doc.setFontSize(13);
  doc.text(title, PDF_RIGHT_EDGE, startY + 4, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(subtitle, PDF_RIGHT_EDGE, startY + 11, { align: "right" });
  doc.setFontSize(8);
  rightLines.forEach((line, i) => {
    doc.text(line, PDF_RIGHT_EDGE, startY + 19 + i * 6, { align: "right" });
  });

  return headerHeight + 8;
}

export async function generateQuotePdfBlob(
  quote: Quote,
  client: Client,
  survey?: Survey,
): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const totals = calculateQuoteTotals(quote);
  const doc = new jsPDF();
  const margin = 14;
  const logoDataUrl = await loadLogoDataUrl();
  const contentY = drawPdfHeader(doc, logoDataUrl, "COTIZACIÓN", "INSTALACIÓN ELÉCTRICA", [
    `Folio: ${quote.numero}`,
    `Fecha: ${formatDate(quote.fecha)}`,
    `Válida por: ${quote.validezDias} días`,
  ]);

  doc.setFontSize(12);
  doc.setTextColor(...NAVY_RGB);
  doc.text("Cliente", margin, contentY);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(client.nombre, margin, contentY + 6);
  let clientY = contentY + 12;
  if (client.empresa) {
    doc.text(client.empresa, margin, clientY);
    clientY += 6;
  }
  doc.text(`Tel: ${client.telefono}`, margin, clientY);
  clientY += 6;
  if (client.email) {
    doc.text(`Email: ${client.email}`, margin, clientY);
    clientY += 6;
  }
  doc.text(`Dir: ${client.direccion}`, margin, clientY);
  clientY += 6;

  if (survey) {
    doc.text(`Obra: ${survey.direccionObra}`, margin, clientY);
    clientY += 6;
    doc.text(
      `Levantamiento: ${survey.titulo} (${survey.numCircuitos} circuitos, ${survey.metrosCable}m cable)`,
      margin,
      clientY,
    );
    clientY += 6;
  }

  let startY = clientY + 4;

  if (quote.materiales.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(...NAVY_RGB);
    doc.text("Materiales", margin, startY);
    autoTable(doc, {
      startY: startY + 4,
      head: [["Descripción", "Unidad", "Cant.", "P.U.", "Importe"]],
      body: quote.materiales.map((item) => [
        item.descripcion,
        item.unidad,
        item.cantidad.toString(),
        formatCurrency(item.precioUnitario),
        formatCurrency(item.cantidad * item.precioUnitario),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: NAVY_RGB, textColor: [255, 255, 255] },
    });
    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  if (quote.manoObra.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(...NAVY_RGB);
    doc.text("Mano de obra", margin, startY);
    autoTable(doc, {
      startY: startY + 4,
      head: [["Descripción", "Horas", "Tarifa/hr", "Importe"]],
      body: quote.manoObra.map((item) => [
        item.descripcion,
        item.horas.toString(),
        formatCurrency(item.tarifaHora),
        formatCurrency(item.horas * item.tarifaHora),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: NAVY_RGB, textColor: [255, 255, 255] },
    });
    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Subtotal materiales: ${formatCurrency(totals.subtotalMateriales)}`, margin, startY);
  doc.text(`Subtotal mano de obra: ${formatCurrency(totals.subtotalManoObra)}`, margin, startY + 6);
  doc.text(`Subtotal: ${formatCurrency(totals.subtotal)}`, margin, startY + 12);
  doc.text(`IVA (${quote.ivaPorcentaje}%): ${formatCurrency(totals.iva)}`, margin, startY + 18);
  doc.setFontSize(13);
  doc.setTextColor(...NAVY_RGB);
  doc.text(`TOTAL: ${formatCurrency(totals.total)}`, margin, startY + 28);

  if (quote.notas) {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Notas:", margin, startY + 40);
    const splitNotes = doc.splitTextToSize(quote.notas, 180);
    doc.text(splitNotes, margin, startY + 46);
  }

  drawPdfFooter(doc);
  return { blob: doc.output("blob"), filename: `${quote.numero}.pdf` };
}

export async function exportQuotePdf(
  quote: Quote,
  client: Client,
  survey?: Survey,
): Promise<void> {
  const { downloadPdf } = await import("./share-pdf");
  const { blob, filename } = await generateQuotePdfBlob(quote, client, survey);
  downloadPdf(blob, filename);
}

function drawPdfFooter(doc: import("jspdf").jsPDF) {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(...NAVY_RGB);
  doc.rect(0, pageHeight - PDF_FOOTER_HEIGHT, PDF_PAGE_WIDTH, PDF_FOOTER_HEIGHT, "F");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD_RGB);
  doc.text(COMPANY_LEGAL_NAME, 105, pageHeight - 16, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(`${COMPANY_NAME}  ·  RFC: ${COMPANY_RFC}`, 105, pageHeight - 11, { align: "center" });
  doc.text(COMPANY_ADDRESS, 105, pageHeight - 7, { align: "center" });
  doc.text(`Tel: ${COMPANY_PHONE_DISPLAY}  ·  ${COMPANY_EMAIL}`, 105, pageHeight - 3, {
    align: "center",
  });
}

export async function generateServiceSheetPdfBlob(
  sheet: ServiceSheet,
  client: Client,
): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  const margin = 14;
  const logoDataUrl = await loadLogoDataUrl();
  const garantiaHasta = new Date(sheet.fecha);
  garantiaHasta.setMonth(garantiaHasta.getMonth() + sheet.garantiaMeses);

  const contentY = drawPdfHeader(doc, logoDataUrl, "HOJA DE SERVICIO", "COMPROBANTE DE TRABAJO", [
    `Folio: ${sheet.numero}`,
    `Fecha: ${formatDate(sheet.fecha)}`,
    `Garantía: ${sheet.garantiaMeses} meses`,
  ]);

  doc.setFontSize(12);
  doc.setTextColor(...NAVY_RGB);
  doc.text("Cliente", margin, contentY);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(client.nombre, margin, contentY + 6);
  let y = contentY + 12;
  if (client.telefono) {
    doc.text(`Tel: ${client.telefono}`, margin, y);
    y += 6;
  }
  doc.text(`Ubicación del servicio: ${sheet.direccionServicio}`, margin, y);
  y += 6;
  doc.text(`Tipo: ${SERVICE_TYPE_LABELS[sheet.tipoServicio]}`, margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(...NAVY_RGB);
  doc.text("Trabajo realizado", margin, y);
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(doc.splitTextToSize(sheet.descripcionTrabajo, 180), margin, y);
  y += doc.splitTextToSize(sheet.descripcionTrabajo, 180).length * 5 + 6;

  if (sheet.materiales.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(...NAVY_RGB);
    doc.text("Materiales utilizados", margin, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Descripción", "Unidad", "Cantidad"]],
      body: sheet.materiales.map((item) => [
        item.descripcion,
        item.unidad,
        item.cantidad.toString(),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: NAVY_RGB, textColor: [255, 255, 255] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  doc.setFillColor(254, 249, 231);
  doc.roundedRect(margin, y, 182, 22, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY_RGB);
  doc.text("Garantía del servicio", margin + 4, y + 8);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `Este servicio cuenta con ${sheet.garantiaMeses} meses de garantía vigente hasta el ${formatDate(garantiaHasta)}.`,
    margin + 4,
    y + 15,
  );

  y += 30;

  if (sheet.notas) {
    y = ensurePdfSpace(doc, y, 20);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Notas:", margin, y);
    const noteLines = doc.splitTextToSize(sheet.notas, 180);
    doc.text(noteLines, margin, y + 5);
    y += 5 + noteLines.length * 5 + 6;
  }

  if (sheet.tecnico) {
    y = ensurePdfSpace(doc, y, 10);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Técnico responsable: ${sheet.tecnico}`, margin, y);
    y += 8;
  }

  y = ensurePdfSpace(doc, y, 8);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Documento comprobante del servicio eléctrico realizado. Conserve para trámite de garantías.",
    margin,
    y,
  );

  drawPdfFooter(doc);
  return { blob: doc.output("blob"), filename: `${sheet.numero}.pdf` };
}

export async function exportServiceSheetPdf(
  sheet: ServiceSheet,
  client: Client,
): Promise<void> {
  const { downloadPdf } = await import("./share-pdf");
  const { blob, filename } = await generateServiceSheetPdfBlob(sheet, client);
  downloadPdf(blob, filename);
}
