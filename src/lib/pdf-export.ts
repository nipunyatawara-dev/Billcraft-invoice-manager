import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { getInvoiceItemsTotal, type Invoice, type UserProfile } from "@/data/invoices";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const PAGE_BOTTOM = 56;

const FONT_PATHS = {
  regular: "/fonts/google-sans-flex/google-sans-flex-latin-400-normal.ttf",
  semibold: "/fonts/google-sans-flex/google-sans-flex-latin-600-normal.ttf",
  bold: "/fonts/google-sans-flex/google-sans-flex-latin-700-normal.ttf",
} as const;

type PdfFontName = keyof typeof FONT_PATHS;
type PdfFonts = Record<PdfFontName, PDFFont>;
type PdfColor = RGB;

const TEXT = rgb(0.11, 0.13, 0.18);
const MUTED = rgb(0.42, 0.45, 0.52);
const BORDER = rgb(0.84, 0.86, 0.9);
const SOFT = rgb(0.96, 0.97, 0.99);
const INK = rgb(0.08, 0.11, 0.18);
const WHITE = rgb(1, 1, 1);
const ACCENT = rgb(0.25, 0.32, 0.76);
const ACCENT_SOFT = rgb(0.93, 0.95, 1);
const POSITIVE = rgb(0.05, 0.48, 0.32);
const WARNING = rgb(0.78, 0.23, 0.14);

let fontBytesCache: Partial<Record<PdfFontName, Uint8Array>> = {};

function pdfText(value: unknown) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

function wrapText(value: string, maxCharacters: number) {
  const words = pdfText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    if (word.length > maxCharacters) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }

      for (let index = 0; index < word.length; index += maxCharacters) {
        lines.push(word.slice(index, index + maxCharacters));
      }

      return;
    }

    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxCharacters && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function formatPdfCurrency(value: number, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function invoiceFileName(invoice: Invoice) {
  return `${invoice.id.replace(/[^a-z0-9-]+/gi, "").toUpperCase() || "INVOICE"}.pdf`;
}

function businessInitials(value: string) {
  const parts = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 1) {
    return parts[0].replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "BC";
  }

  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "BC";
}

function statusColor(status: Invoice["status"]): PdfColor {
  if (status === "Paid") {
    return POSITIVE;
  }

  if (status === "Overdue") {
    return WARNING;
  }

  return ACCENT;
}

async function loadFontBytes(name: PdfFontName) {
  if (fontBytesCache[name]) {
    return fontBytesCache[name];
  }

  const response = await fetch(FONT_PATHS[name]);

  if (!response.ok) {
    throw new Error("Unable to load Google Sans Flex for invoice export.");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  fontBytesCache = { ...fontBytesCache, [name]: bytes };
  return bytes;
}

async function embedGoogleSansFlex(pdf: PDFDocument): Promise<PdfFonts> {
  pdf.registerFontkit(fontkit);

  const [regular, semibold, bold] = await Promise.all([
    loadFontBytes("regular"),
    loadFontBytes("semibold"),
    loadFontBytes("bold"),
  ]);

  return {
    regular: await pdf.embedFont(regular, { subset: false }),
    semibold: await pdf.embedFont(semibold, { subset: false }),
    bold: await pdf.embedFont(bold, { subset: false }),
  };
}

function addText(
  page: PDFPage,
  fonts: PdfFonts,
  value: unknown,
  x: number,
  y: number,
  size = 10,
  font: PdfFontName = "regular",
  color: PdfColor = TEXT,
  align: "left" | "right" | "center" = "left",
) {
  const text = pdfText(value);
  const selectedFont = fonts[font];
  const width = selectedFont.widthOfTextAtSize(text, size);
  const left = align === "right" ? x - width : align === "center" ? x - width / 2 : x;

  page.drawText(text, {
    x: left,
    y,
    size,
    font: selectedFont,
    color,
  });
}

function addLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color: PdfColor = BORDER) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: 0.8,
    color,
  });
}

function addRect(page: PDFPage, x: number, y: number, width: number, height: number, color: PdfColor = SOFT) {
  page.drawRectangle({ x, y, width, height, color });
}

function addStrokeRect(page: PDFPage, x: number, y: number, width: number, height: number, color: PdfColor = BORDER) {
  page.drawRectangle({ x, y, width, height, borderColor: color, borderWidth: 0.8 });
}

function addTextBlock(
  page: PDFPage,
  fonts: PdfFonts,
  lines: string[],
  x: number,
  y: number,
  maxCharacters: number,
  firstLineSize = 11,
  firstLineFont: PdfFontName = "semibold",
  color: PdfColor = TEXT,
) {
  let nextY = y;

  lines.filter(Boolean).forEach((line, lineIndex) => {
    wrapText(line, maxCharacters).forEach((wrappedLine, wrappedIndex) => {
      const isFirstLine = lineIndex === 0 && wrappedIndex === 0;
      addText(
        page,
        fonts,
        wrappedLine,
        x,
        nextY,
        isFirstLine ? firstLineSize : 9.5,
        isFirstLine ? firstLineFont : "regular",
        isFirstLine ? color : MUTED,
      );
      nextY -= isFirstLine ? 15 : 13;
    });
  });

  return nextY;
}

export async function createInvoicePdfBlob(invoice: Invoice, profile: UserProfile | null, currency: string) {
  const pdf = await PDFDocument.create();
  const fonts = await embedGoogleSansFlex(pdf);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - PAGE_MARGIN;
  const businessName = profile?.businessName || profile?.name || "BillCraft";
  const invoiceTotal = typeof invoice.total === "number" ? invoice.total : getInvoiceItemsTotal(invoice.items || []);
  const statusTone = statusColor(invoice.status);

  function drawFooter(currentPage: PDFPage, pageIndex: number) {
    addLine(currentPage, PAGE_MARGIN, 48, PAGE_WIDTH - PAGE_MARGIN, 48, rgb(0.9, 0.91, 0.94));
    addText(currentPage, fonts, `${businessName} | ${invoice.id}`, PAGE_MARGIN, 30, 8, "regular", MUTED);
    addText(currentPage, fonts, `Page ${pageIndex + 1} of ${pdf.getPageCount()}`, PAGE_WIDTH - PAGE_MARGIN, 30, 8, "regular", MUTED, "right");
  }

  function drawTableHeader(currentPage: PDFPage, headerY: number) {
    addRect(currentPage, PAGE_MARGIN, headerY - 24, CONTENT_WIDTH, 28, INK);
    addText(currentPage, fonts, "WORK", PAGE_MARGIN + 14, headerY - 14, 8.5, "bold", WHITE);
    addText(currentPage, fonts, "QTY", PAGE_WIDTH - PAGE_MARGIN - 184, headerY - 14, 8.5, "bold", WHITE, "right");
    addText(currentPage, fonts, "RATE", PAGE_WIDTH - PAGE_MARGIN - 92, headerY - 14, 8.5, "bold", WHITE, "right");
    addText(currentPage, fonts, "AMOUNT", PAGE_WIDTH - PAGE_MARGIN - 14, headerY - 14, 8.5, "bold", WHITE, "right");
  }

  function addPage() {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - PAGE_MARGIN;
    addText(page, fonts, businessName, PAGE_MARGIN, y, 12, "semibold", TEXT);
    addText(page, fonts, `${invoice.id} continued`, PAGE_WIDTH - PAGE_MARGIN, y, 10, "semibold", MUTED, "right");
    y -= 22;
    addLine(page, PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y);
    y -= 28;
    drawTableHeader(page, y);
    y -= 44;
  }

  function ensureSpace(height: number) {
    if (y - height < PAGE_BOTTOM) {
      addPage();
    }
  }

  const fromLines = [
    businessName,
    profile?.profession,
    profile?.email,
    profile?.phone,
  ].filter(Boolean) as string[];
  const clientLines = [
    invoice.client,
    invoice.company,
    invoice.email,
    invoice.phone,
    invoice.address,
  ].filter(Boolean) as string[];

  addRect(page, 0, PAGE_HEIGHT - 18, PAGE_WIDTH, 18, INK);
  addRect(page, PAGE_MARGIN, y - 41, 42, 42, INK);
  addText(page, fonts, businessInitials(businessName), PAGE_MARGIN + 21, y - 26, 13, "bold", WHITE, "center");
  addText(page, fonts, businessName, PAGE_MARGIN + 56, y - 8, 15, "bold", TEXT);
  addText(page, fonts, profile?.profession || "Freelance services", PAGE_MARGIN + 56, y - 26, 9.5, "regular", MUTED);
  addText(page, fonts, [profile?.email, profile?.phone].filter(Boolean).join(" | "), PAGE_MARGIN + 56, y - 40, 8.5, "regular", MUTED);
  addText(page, fonts, "INVOICE", PAGE_WIDTH - PAGE_MARGIN, y - 4, 25, "bold", TEXT, "right");
  addText(page, fonts, invoice.id, PAGE_WIDTH - PAGE_MARGIN, y - 24, 10.5, "semibold", MUTED, "right");
  addRect(page, PAGE_WIDTH - PAGE_MARGIN - 78, y - 48, 78, 20, statusTone);
  addText(page, fonts, invoice.status.toUpperCase(), PAGE_WIDTH - PAGE_MARGIN - 39, y - 42, 8.5, "bold", WHITE, "center");
  y -= 78;

  addRect(page, PAGE_MARGIN, y - 88, CONTENT_WIDTH, 88, ACCENT_SOFT);
  addText(page, fonts, "TOTAL INVOICE VALUE", PAGE_MARGIN + 20, y - 26, 8.5, "bold", ACCENT);
  addText(page, fonts, formatPdfCurrency(invoiceTotal, currency), PAGE_MARGIN + 20, y - 57, 24, "bold", TEXT);
  addText(page, fonts, "Invoice date", PAGE_WIDTH - PAGE_MARGIN - 178, y - 25, 8.5, "bold", MUTED);
  addText(page, fonts, invoice.date || "Not set", PAGE_WIDTH - PAGE_MARGIN - 178, y - 43, 10, "bold", TEXT);
  addText(page, fonts, "Due date", PAGE_WIDTH - PAGE_MARGIN - 70, y - 25, 8.5, "bold", MUTED);
  addText(page, fonts, invoice.dueDate || "No due date", PAGE_WIDTH - PAGE_MARGIN - 70, y - 43, 10, "bold", TEXT);
  addText(page, fonts, invoice.templateName || "Classic Invoice", PAGE_WIDTH - PAGE_MARGIN - 20, y - 68, 8.5, "regular", MUTED, "right");
  y -= 120;

  const cardGap = 18;
  const cardWidth = (CONTENT_WIDTH - cardGap) / 2;
  const cardHeight = 132;
  addRect(page, PAGE_MARGIN, y - cardHeight, cardWidth, cardHeight, WHITE);
  addStrokeRect(page, PAGE_MARGIN, y - cardHeight, cardWidth, cardHeight);
  addRect(page, PAGE_MARGIN + cardWidth + cardGap, y - cardHeight, cardWidth, cardHeight, WHITE);
  addStrokeRect(page, PAGE_MARGIN + cardWidth + cardGap, y - cardHeight, cardWidth, cardHeight);
  addText(page, fonts, "FROM", PAGE_MARGIN + 16, y - 24, 8.5, "bold", MUTED);
  addText(page, fonts, "BILL TO", PAGE_MARGIN + cardWidth + cardGap + 16, y - 24, 8.5, "bold", MUTED);
  addTextBlock(page, fonts, fromLines, PAGE_MARGIN + 16, y - 46, 31);
  addTextBlock(page, fonts, clientLines, PAGE_MARGIN + cardWidth + cardGap + 16, y - 46, 31);
  y -= cardHeight + 34;

  drawTableHeader(page, y);
  y -= 44;

  const items = invoice.items && invoice.items.length > 0
    ? invoice.items
    : [{ id: "total", description: "Invoice total", quantity: 1, price: invoiceTotal }];

  items.forEach((item, itemIndex) => {
    const lines = wrapText(item.description || "Work item", 52);
    const rowHeight = Math.max(lines.length * 13 + 18, 38);

    ensureSpace(rowHeight);

    const rowTop = y;
    addRect(page, PAGE_MARGIN, rowTop - rowHeight + 11, CONTENT_WIDTH, rowHeight, itemIndex % 2 === 0 ? SOFT : WHITE);
    lines.forEach((line, index) => {
      addText(page, fonts, line, PAGE_MARGIN + 14, rowTop - index * 13, 10, index === 0 ? "semibold" : "regular", index === 0 ? TEXT : MUTED);
    });
    addText(page, fonts, String(item.quantity), PAGE_WIDTH - PAGE_MARGIN - 184, rowTop, 10, "regular", MUTED, "right");
    addText(page, fonts, formatPdfCurrency(item.price, currency), PAGE_WIDTH - PAGE_MARGIN - 92, rowTop, 10, "regular", MUTED, "right");
    addText(page, fonts, formatPdfCurrency(item.quantity * item.price, currency), PAGE_WIDTH - PAGE_MARGIN - 14, rowTop, 10, "bold", TEXT, "right");
    y -= rowHeight;
    addLine(page, PAGE_MARGIN, y + 11, PAGE_WIDTH - PAGE_MARGIN, y + 11, rgb(0.9, 0.91, 0.94));
  });

  ensureSpace(150);
  y -= 22;
  addText(page, fonts, "Payment note", PAGE_MARGIN, y, 10, "bold", TEXT);
  y -= 16;
  addText(page, fonts, `Please use ${invoice.id} as the payment reference.`, PAGE_MARGIN, y, 9.5, "regular", MUTED);
  y -= 15;
  addText(page, fonts, invoice.dueDate ? `Payment is due by ${invoice.dueDate}.` : "No due date was set for this invoice.", PAGE_MARGIN, y, 9.5, "regular", MUTED);

  const summaryX = PAGE_WIDTH - PAGE_MARGIN - 220;
  const summaryTop = y + 44;
  addRect(page, summaryX, summaryTop - 100, 220, 100, WHITE);
  addStrokeRect(page, summaryX, summaryTop - 100, 220, 100);
  addText(page, fonts, "Subtotal", summaryX + 16, summaryTop - 28, 10, "regular", MUTED);
  addText(page, fonts, formatPdfCurrency(invoice.subtotal || invoiceTotal, currency), summaryX + 204, summaryTop - 28, 10, "regular", TEXT, "right");
  addLine(page, summaryX + 16, summaryTop - 48, summaryX + 204, summaryTop - 48);
  addText(page, fonts, invoice.status === "Paid" ? "Paid total" : "Balance due", summaryX + 16, summaryTop - 73, 13, "bold", TEXT);
  addText(page, fonts, formatPdfCurrency(invoiceTotal, currency), summaryX + 204, summaryTop - 73, 13, "bold", TEXT, "right");
  y = summaryTop - 124;

  if (profile?.signature) {
    addText(page, fonts, "Signature on file", summaryX + 204, y, 9, "bold", MUTED, "right");
  }

  y = Math.max(y - 12, PAGE_BOTTOM + 18);
  addText(page, fonts, "Thank you for your business.", PAGE_MARGIN, y, 11, "bold", TEXT);

  pdf.getPages().forEach((currentPage, index) => {
    drawFooter(currentPage, index);
  });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export async function exportInvoicePdf(invoice: Invoice, profile: UserProfile | null, currency: string) {
  const blob = await createInvoicePdfBlob(invoice, profile, currency);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = invoiceFileName(invoice);
  link.click();
  URL.revokeObjectURL(url);
}
