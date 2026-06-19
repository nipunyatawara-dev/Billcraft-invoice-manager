import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { getAmountPaid, getBalanceDue, getInvoiceItemsTotal, getPaymentState, isDueDateOverdue, getInvoiceTotal, type Invoice, type UserProfile, type OutsourcingInvoice, type Client } from "@/data/invoices";

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
    regular: await pdf.embedFont(regular, { subset: true }),
    semibold: await pdf.embedFont(semibold, { subset: true }),
    bold: await pdf.embedFont(bold, { subset: true }),
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

async function createInvoicePdfBlob(invoice: Invoice, profile: UserProfile | null, currency: string) {
  const pdf = await PDFDocument.create();
  const fonts = await embedGoogleSansFlex(pdf);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - PAGE_MARGIN;
  const businessName = profile?.businessName || profile?.name || "BillCraft";
  const invoiceTotal = typeof invoice.total === "number" ? invoice.total : getInvoiceItemsTotal(invoice.items || []);
  const amountPaid = getAmountPaid(invoice);
  const balanceDue = getBalanceDue(invoice);
  const paymentState = getPaymentState(invoice);
  const statusTone = statusColor(invoice.status);
  const templateId = invoice.templateId || "classic";

  function drawFooter(currentPage: PDFPage, pageIndex: number) {
    addLine(currentPage, PAGE_MARGIN, 48, PAGE_WIDTH - PAGE_MARGIN, 48, rgb(0.9, 0.91, 0.94));
    addText(currentPage, fonts, `${businessName} | ${invoice.id}`, PAGE_MARGIN, 30, 8, "regular", MUTED);
    addText(currentPage, fonts, `Page ${pageIndex + 1} of ${pdf.getPageCount()}`, PAGE_WIDTH - PAGE_MARGIN, 30, 8, "regular", MUTED, "right");
  }

  function drawTableHeader(currentPage: PDFPage, headerY: number) {
    if (templateId === "minimal") {
      addLine(currentPage, PAGE_MARGIN, headerY, PAGE_WIDTH - PAGE_MARGIN, headerY, BORDER);
      addLine(currentPage, PAGE_MARGIN, headerY - 24, PAGE_WIDTH - PAGE_MARGIN, headerY - 24, BORDER);
      addText(currentPage, fonts, "WORK", PAGE_MARGIN + 4, headerY - 14, 8.5, "bold", MUTED);
      addText(currentPage, fonts, "QTY", PAGE_WIDTH - PAGE_MARGIN - 184, headerY - 14, 8.5, "bold", MUTED, "right");
      addText(currentPage, fonts, "RATE", PAGE_WIDTH - PAGE_MARGIN - 92, headerY - 14, 8.5, "bold", MUTED, "right");
      addText(currentPage, fonts, "AMOUNT", PAGE_WIDTH - PAGE_MARGIN - 4, headerY - 14, 8.5, "bold", MUTED, "right");
    } else if (templateId === "detailed") {
      addRect(currentPage, PAGE_MARGIN, headerY - 24, CONTENT_WIDTH, 28, SOFT);
      addStrokeRect(currentPage, PAGE_MARGIN, headerY - 24, CONTENT_WIDTH, 28, BORDER);
      addLine(currentPage, PAGE_WIDTH - PAGE_MARGIN - 210, headerY, PAGE_WIDTH - PAGE_MARGIN - 210, headerY - 24, BORDER);
      addLine(currentPage, PAGE_WIDTH - PAGE_MARGIN - 120, headerY, PAGE_WIDTH - PAGE_MARGIN - 120, headerY - 24, BORDER);
      addText(currentPage, fonts, "WORK ITEM", PAGE_MARGIN + 12, headerY - 14, 8.5, "bold", TEXT);
      addText(currentPage, fonts, "QTY", PAGE_WIDTH - PAGE_MARGIN - 165, headerY - 14, 8.5, "bold", TEXT, "center");
      addText(currentPage, fonts, "RATE", PAGE_WIDTH - PAGE_MARGIN - 70, headerY - 14, 8.5, "bold", TEXT, "center");
      addText(currentPage, fonts, "AMOUNT", PAGE_WIDTH - PAGE_MARGIN - 12, headerY - 14, 8.5, "bold", TEXT, "right");
    } else if (templateId === "branded") {
      addRect(currentPage, PAGE_MARGIN, headerY - 24, CONTENT_WIDTH, 28, ACCENT);
      addText(currentPage, fonts, "WORK", PAGE_MARGIN + 14, headerY - 14, 8.5, "bold", WHITE);
      addText(currentPage, fonts, "QTY", PAGE_WIDTH - PAGE_MARGIN - 184, headerY - 14, 8.5, "bold", WHITE, "right");
      addText(currentPage, fonts, "RATE", PAGE_WIDTH - PAGE_MARGIN - 92, headerY - 14, 8.5, "bold", WHITE, "right");
      addText(currentPage, fonts, "AMOUNT", PAGE_WIDTH - PAGE_MARGIN - 14, headerY - 14, 8.5, "bold", WHITE, "right");
    } else {
      addRect(currentPage, PAGE_MARGIN, headerY - 24, CONTENT_WIDTH, 28, INK);
      addText(currentPage, fonts, "WORK", PAGE_MARGIN + 14, headerY - 14, 8.5, "bold", WHITE);
      addText(currentPage, fonts, "QTY", PAGE_WIDTH - PAGE_MARGIN - 184, headerY - 14, 8.5, "bold", WHITE, "right");
      addText(currentPage, fonts, "RATE", PAGE_WIDTH - PAGE_MARGIN - 92, headerY - 14, 8.5, "bold", WHITE, "right");
      addText(currentPage, fonts, "AMOUNT", PAGE_WIDTH - PAGE_MARGIN - 14, headerY - 14, 8.5, "bold", WHITE, "right");
    }
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

  // Render Header according to template
  if (templateId === "minimal") {
    addText(page, fonts, businessName, PAGE_MARGIN, y, 18, "bold", TEXT);
    addText(page, fonts, profile?.profession || "Consultant", PAGE_MARGIN, y - 16, 10, "regular", MUTED);
    addText(page, fonts, [profile?.email, profile?.phone].filter(Boolean).join(" | "), PAGE_MARGIN, y - 28, 8.5, "regular", MUTED);
    
    addText(page, fonts, "INVOICE", PAGE_WIDTH - PAGE_MARGIN, y, 22, "bold", TEXT, "right");
    addText(page, fonts, invoice.id, PAGE_WIDTH - PAGE_MARGIN, y - 16, 10.5, "semibold", MUTED, "right");
    addText(page, fonts, paymentState.toUpperCase(), PAGE_WIDTH - PAGE_MARGIN, y - 28, 9, "bold", statusTone, "right");
    y -= 54;
  } else if (templateId === "bold") {
    addRect(page, PAGE_MARGIN, y - 64, CONTENT_WIDTH, 64, INK);
    addText(page, fonts, "INVOICE", PAGE_MARGIN + 16, y - 22, 11, "bold", rgb(0.8, 0.8, 0.8));
    addText(page, fonts, invoice.id, PAGE_MARGIN + 16, y - 46, 18, "bold", WHITE);
    
    addText(page, fonts, `DATE: ${invoice.date || "N/A"}`, PAGE_WIDTH - PAGE_MARGIN - 16, y - 18, 9.5, "semibold", rgb(0.8, 0.8, 0.8), "right");
    if (invoice.dueDate) {
      addText(page, fonts, `DUE DATE: ${invoice.dueDate}`, PAGE_WIDTH - PAGE_MARGIN - 16, y - 32, 9.5, "semibold", rgb(0.8, 0.8, 0.8), "right");
    }
    addText(page, fonts, `STATUS: ${paymentState.toUpperCase()}`, PAGE_WIDTH - PAGE_MARGIN - 16, y - 46, 9.5, "bold", WHITE, "right");
    y -= 88;
  } else if (templateId === "branded") {
    addRect(page, 0, PAGE_HEIGHT - 22, PAGE_WIDTH, 22, ACCENT);
    addRect(page, PAGE_MARGIN, y - 41, 42, 42, ACCENT_SOFT);
    addStrokeRect(page, PAGE_MARGIN, y - 41, 42, 42, ACCENT);
    addText(page, fonts, businessInitials(businessName), PAGE_MARGIN + 21, y - 26, 13, "bold", ACCENT, "center");
    
    addText(page, fonts, businessName, PAGE_MARGIN + 56, y - 8, 15, "bold", TEXT);
    addText(page, fonts, profile?.profession || "Professional Services", PAGE_MARGIN + 56, y - 24, 9.5, "semibold", ACCENT);
    addText(page, fonts, [profile?.email, profile?.phone].filter(Boolean).join(" | "), PAGE_MARGIN + 56, y - 38, 8.5, "regular", MUTED);
    
    addText(page, fonts, "INVOICE", PAGE_WIDTH - PAGE_MARGIN, y - 4, 25, "bold", TEXT, "right");
    addText(page, fonts, invoice.id, PAGE_WIDTH - PAGE_MARGIN, y - 24, 10.5, "semibold", ACCENT, "right");
    addRect(page, PAGE_WIDTH - PAGE_MARGIN - 104, y - 48, 104, 20, ACCENT);
    addText(page, fonts, paymentState.toUpperCase(), PAGE_WIDTH - PAGE_MARGIN - 52, y - 42, 8, "bold", WHITE, "center");
    y -= 78;
  } else if (templateId === "detailed") {
    const headerHeight = 72;
    addRect(page, PAGE_MARGIN, y - headerHeight, CONTENT_WIDTH, headerHeight, SOFT);
    addStrokeRect(page, PAGE_MARGIN, y - headerHeight, CONTENT_WIDTH, headerHeight, BORDER);
    addLine(page, PAGE_MARGIN + CONTENT_WIDTH / 2, y, PAGE_MARGIN + CONTENT_WIDTH / 2, y - headerHeight, BORDER);
    
    addText(page, fonts, "SERVICE PROVIDER", PAGE_MARGIN + 16, y - 16, 7.5, "bold", MUTED);
    addText(page, fonts, businessName, PAGE_MARGIN + 16, y - 34, 12, "bold", TEXT);
    addText(page, fonts, profile?.profession || "Professional Services", PAGE_MARGIN + 16, y - 48, 9, "regular", MUTED);
    addText(page, fonts, [profile?.email, profile?.phone].filter(Boolean).join(" | "), PAGE_MARGIN + 16, y - 60, 8, "regular", MUTED);
    
    addText(page, fonts, "PAYABLE METADATA", PAGE_MARGIN + CONTENT_WIDTH / 2 + 16, y - 16, 7.5, "bold", MUTED);
    addText(page, fonts, `Invoice Ref:  ${invoice.id}`, PAGE_MARGIN + CONTENT_WIDTH / 2 + 16, y - 32, 9, "bold", TEXT);
    addText(page, fonts, `Issue Date:   ${invoice.date || "N/A"}`, PAGE_MARGIN + CONTENT_WIDTH / 2 + 16, y - 44, 9, "regular", TEXT);
    addText(page, fonts, `Due Date:     ${invoice.dueDate || "N/A"}`, PAGE_MARGIN + CONTENT_WIDTH / 2 + 16, y - 56, 9, "regular", TEXT);
    addText(page, fonts, `Status:       ${paymentState}`, PAGE_MARGIN + CONTENT_WIDTH / 2 + 16, y - 68, 9, "bold", statusTone);
    y -= headerHeight + 20;
  } else {
    addRect(page, 0, PAGE_HEIGHT - 18, PAGE_WIDTH, 18, INK);
    addRect(page, PAGE_MARGIN, y - 41, 42, 42, INK);
    addText(page, fonts, businessInitials(businessName), PAGE_MARGIN + 21, y - 26, 13, "bold", WHITE, "center");
    addText(page, fonts, businessName, PAGE_MARGIN + 56, y - 8, 15, "bold", TEXT);
    addText(page, fonts, profile?.profession || "Freelance services", PAGE_MARGIN + 56, y - 26, 9.5, "regular", MUTED);
    addText(page, fonts, [profile?.email, profile?.phone].filter(Boolean).join(" | "), PAGE_MARGIN + 56, y - 40, 8.5, "regular", MUTED);
    addText(page, fonts, "INVOICE", PAGE_WIDTH - PAGE_MARGIN, y - 4, 25, "bold", TEXT, "right");
    addText(page, fonts, invoice.id, PAGE_WIDTH - PAGE_MARGIN, y - 24, 10.5, "semibold", MUTED, "right");
    addRect(page, PAGE_WIDTH - PAGE_MARGIN - 104, y - 48, 104, 20, statusTone);
    addText(page, fonts, paymentState.toUpperCase(), PAGE_WIDTH - PAGE_MARGIN - 52, y - 42, 8, "bold", WHITE, "center");
    y -= 78;
  }

  const activePdfCurrency = invoice.currency || currency;

  // Render Address/Card details according to template
  if (templateId === "minimal") {
    addText(page, fonts, "BILLED TO", PAGE_MARGIN, y - 10, 8, "bold", MUTED);
    y = addTextBlock(page, fonts, clientLines, PAGE_MARGIN, y - 26, 50, 11, "semibold", TEXT);
    y -= 20;
  } else if (templateId === "bold") {
    const cardGap = 18;
    const cardWidth = (CONTENT_WIDTH - cardGap) / 2;
    const cardHeight = 110;
    
    addRect(page, PAGE_MARGIN, y - cardHeight, cardWidth, cardHeight, SOFT);
    addRect(page, PAGE_MARGIN, y - cardHeight, 4, cardHeight, INK);
    addRect(page, PAGE_MARGIN + cardWidth + cardGap, y - cardHeight, cardWidth, cardHeight, SOFT);
    addRect(page, PAGE_MARGIN + cardWidth + cardGap, y - cardHeight, 4, cardHeight, MUTED);
    
    addText(page, fonts, "FROM", PAGE_MARGIN + 16, y - 18, 8, "bold", MUTED);
    addTextBlock(page, fonts, fromLines, PAGE_MARGIN + 16, y - 36, 31);
    
    addText(page, fonts, "BILLED TO", PAGE_MARGIN + cardWidth + cardGap + 16, y - 18, 8, "bold", MUTED);
    addTextBlock(page, fonts, clientLines, PAGE_MARGIN + cardWidth + cardGap + 16, y - 36, 31);
    y -= cardHeight + 24;
  } else if (templateId === "branded") {
    const cardGap = 18;
    const cardWidth = (CONTENT_WIDTH - cardGap) / 2;
    const cardHeight = 110;
    
    addRect(page, PAGE_MARGIN, y - cardHeight, cardWidth, cardHeight, SOFT);
    addStrokeRect(page, PAGE_MARGIN, y - cardHeight, cardWidth, cardHeight, BORDER);
    addRect(page, PAGE_MARGIN, y - cardHeight, 4, cardHeight, ACCENT);
    
    addText(page, fonts, "CLIENT DETAILS", PAGE_MARGIN + 16, y - 18, 8, "bold", ACCENT);
    addTextBlock(page, fonts, clientLines, PAGE_MARGIN + 16, y - 36, 31);
    
    addRect(page, PAGE_MARGIN + cardWidth + cardGap, y - cardHeight, cardWidth, cardHeight, WHITE);
    addStrokeRect(page, PAGE_MARGIN + cardWidth + cardGap, y - cardHeight, cardWidth, cardHeight, BORDER);
    
    const rightX = PAGE_MARGIN + cardWidth + cardGap + 16;
    addText(page, fonts, "Invoice Date", rightX, y - 20, 8, "bold", MUTED);
    addText(page, fonts, invoice.date || "Not set", rightX, y - 34, 10, "bold", TEXT);
    addText(page, fonts, "Due Date", rightX + cardWidth / 2, y - 20, 8, "bold", MUTED);
    addText(page, fonts, invoice.dueDate || "Upon Receipt", rightX + cardWidth / 2, y - 34, 10, "bold", TEXT);
    addText(page, fonts, "Payment Status", rightX, y - 64, 8, "bold", MUTED);
    addText(page, fonts, paymentState.toUpperCase(), rightX, y - 78, 10, "bold", ACCENT);
    y -= cardHeight + 24;
  } else if (templateId === "detailed") {
    const boxHeight = 72;
    addRect(page, PAGE_MARGIN, y - boxHeight, CONTENT_WIDTH, boxHeight, SOFT);
    addStrokeRect(page, PAGE_MARGIN, y - boxHeight, CONTENT_WIDTH, boxHeight, BORDER);
    
    addText(page, fonts, "INVOICE RECIPIENT (BILL TO)", PAGE_MARGIN + 16, y - 16, 7.5, "bold", MUTED);
    addText(page, fonts, invoice.client, PAGE_MARGIN + 16, y - 34, 11, "bold", TEXT);
    if (invoice.company) {
      addText(page, fonts, invoice.company, PAGE_MARGIN + 16, y - 48, 9, "regular", MUTED);
    }
    const detailsRightLines = [invoice.email, invoice.phone, invoice.address].filter(Boolean) as string[];
    addTextBlock(page, fonts, detailsRightLines, PAGE_MARGIN + CONTENT_WIDTH / 2 + 16, y - 34, 35, 9, "regular", MUTED);
    y -= boxHeight + 24;
  } else {
    addRect(page, PAGE_MARGIN, y - 88, CONTENT_WIDTH, 88, ACCENT_SOFT);
    addText(page, fonts, "TOTAL INVOICE VALUE", PAGE_MARGIN + 20, y - 26, 8.5, "bold", ACCENT);
    addText(page, fonts, formatPdfCurrency(invoiceTotal, activePdfCurrency), PAGE_MARGIN + 20, y - 57, 24, "bold", TEXT);
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
  }

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
    if (templateId === "minimal") {
      lines.forEach((line, index) => {
        addText(page, fonts, line, PAGE_MARGIN + 4, rowTop - index * 13, 10, index === 0 ? "semibold" : "regular", index === 0 ? TEXT : MUTED);
      });
      addText(page, fonts, String(item.quantity), PAGE_WIDTH - PAGE_MARGIN - 184, rowTop, 10, "regular", MUTED, "right");
      addText(page, fonts, formatPdfCurrency(item.price, activePdfCurrency), PAGE_WIDTH - PAGE_MARGIN - 92, rowTop, 10, "regular", MUTED, "right");
      addText(page, fonts, formatPdfCurrency(item.quantity * item.price, activePdfCurrency), PAGE_WIDTH - PAGE_MARGIN - 4, rowTop, 10, "bold", TEXT, "right");
      y -= rowHeight;
      addLine(page, PAGE_MARGIN, y + 11, PAGE_WIDTH - PAGE_MARGIN, y + 11, rgb(0.93, 0.94, 0.96));
    } else if (templateId === "detailed") {
      addStrokeRect(page, PAGE_MARGIN, rowTop - rowHeight + 11, CONTENT_WIDTH, rowHeight, BORDER);
      addLine(page, PAGE_WIDTH - PAGE_MARGIN - 210, rowTop + 11, PAGE_WIDTH - PAGE_MARGIN - 210, rowTop - rowHeight + 11, BORDER);
      addLine(page, PAGE_WIDTH - PAGE_MARGIN - 120, rowTop + 11, PAGE_WIDTH - PAGE_MARGIN - 120, rowTop - rowHeight + 11, BORDER);
      
      lines.forEach((line, index) => {
        addText(page, fonts, line, PAGE_MARGIN + 12, rowTop - index * 13, 10, index === 0 ? "semibold" : "regular", index === 0 ? TEXT : MUTED);
      });
      addText(page, fonts, String(item.quantity), PAGE_WIDTH - PAGE_MARGIN - 165, rowTop, 10, "regular", MUTED, "center");
      addText(page, fonts, formatPdfCurrency(item.price, activePdfCurrency), PAGE_WIDTH - PAGE_MARGIN - 92, rowTop, 10, "regular", MUTED, "right");
      addText(page, fonts, formatPdfCurrency(item.quantity * item.price, activePdfCurrency), PAGE_WIDTH - PAGE_MARGIN - 12, rowTop, 10, "bold", TEXT, "right");
      y -= rowHeight;
    } else {
      addRect(page, PAGE_MARGIN, rowTop - rowHeight + 11, CONTENT_WIDTH, rowHeight, itemIndex % 2 === 0 ? SOFT : WHITE);
      lines.forEach((line, index) => {
        addText(page, fonts, line, PAGE_MARGIN + 14, rowTop - index * 13, 10, index === 0 ? "semibold" : "regular", index === 0 ? TEXT : MUTED);
      });
      addText(page, fonts, String(item.quantity), PAGE_WIDTH - PAGE_MARGIN - 184, rowTop, 10, "regular", MUTED, "right");
      addText(page, fonts, formatPdfCurrency(item.price, activePdfCurrency), PAGE_WIDTH - PAGE_MARGIN - 92, rowTop, 10, "regular", MUTED, "right");
      addText(page, fonts, formatPdfCurrency(item.quantity * item.price, activePdfCurrency), PAGE_WIDTH - PAGE_MARGIN - 14, rowTop, 10, "bold", TEXT, "right");
      y -= rowHeight;
      addLine(page, PAGE_MARGIN, y + 11, PAGE_WIDTH - PAGE_MARGIN, y + 11, rgb(0.9, 0.91, 0.94));
    }
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
  const subtotal = invoice.subtotal || invoiceTotal;
  const discountVal = invoice.discount || 0;
  const discountType = invoice.discountType || "flat";
  const discountAmount = discountType === "percent" ? (subtotal * discountVal) / 100 : discountVal;
  const hasDiscount = discountVal > 0;
  const cardH = hasDiscount ? 144 : 122;

  if (templateId === "minimal") {
    let currentY = summaryTop - 28;
    addText(page, fonts, "Subtotal", summaryX + 16, currentY, 10, "regular", MUTED);
    addText(page, fonts, formatPdfCurrency(subtotal, activePdfCurrency), summaryX + 204, currentY, 10, "regular", TEXT, "right");
    
    if (hasDiscount) {
      currentY -= 22;
      addText(page, fonts, `Discount ${discountType === "percent" ? `(${discountVal}%)` : ""}`, summaryX + 16, currentY, 10, "regular", MUTED);
      addText(page, fonts, `-${formatPdfCurrency(discountAmount, activePdfCurrency)}`, summaryX + 204, currentY, 10, "regular", WARNING, "right");
    }
    
    currentY -= 24;
    addText(page, fonts, "Paid", summaryX + 16, currentY, 10, "regular", MUTED);
    addText(page, fonts, formatPdfCurrency(amountPaid, activePdfCurrency), summaryX + 204, currentY, 10, "regular", TEXT, "right");
    
    currentY -= 20;
    addLine(page, summaryX + 16, currentY, summaryX + 204, currentY, BORDER);
    
    currentY -= 25;
    addText(page, fonts, "Balance due", summaryX + 16, currentY, 13, "bold", TEXT);
    addText(page, fonts, formatPdfCurrency(balanceDue, activePdfCurrency), summaryX + 204, currentY, 13, "bold", TEXT, "right");
    y = currentY - 49;
  } else if (templateId === "detailed") {
    addRect(page, summaryX, summaryTop - cardH, 220, cardH, SOFT);
    addStrokeRect(page, summaryX, summaryTop - cardH, 220, cardH, BORDER);
    let currentY = summaryTop - 28;
    addText(page, fonts, "Subtotal", summaryX + 16, currentY, 10, "regular", MUTED);
    addText(page, fonts, formatPdfCurrency(subtotal, activePdfCurrency), summaryX + 204, currentY, 10, "regular", TEXT, "right");
    
    if (hasDiscount) {
      currentY -= 22;
      addLine(page, summaryX, currentY + 11, summaryX + 220, currentY + 11, BORDER);
      addText(page, fonts, `Discount ${discountType === "percent" ? `(${discountVal}%)` : ""}`, summaryX + 16, currentY, 10, "regular", MUTED);
      addText(page, fonts, `-${formatPdfCurrency(discountAmount, activePdfCurrency)}`, summaryX + 204, currentY, 10, "regular", WARNING, "right");
    }
    
    currentY -= 24;
    addLine(page, summaryX, currentY + 11, summaryX + 220, currentY + 11, BORDER);
    addText(page, fonts, "Paid", summaryX + 16, currentY, 10, "regular", MUTED);
    addText(page, fonts, formatPdfCurrency(amountPaid, activePdfCurrency), summaryX + 204, currentY, 10, "regular", TEXT, "right");
    
    currentY -= 25;
    addLine(page, summaryX, currentY + 14, summaryX + 220, currentY + 14, BORDER);
    addText(page, fonts, "Balance due", summaryX + 16, currentY, 13, "bold", TEXT);
    addText(page, fonts, formatPdfCurrency(balanceDue, activePdfCurrency), summaryX + 204, currentY, 13, "bold", TEXT, "right");
    y = currentY - 49;
  } else if (templateId === "branded") {
    addRect(page, summaryX, summaryTop - cardH, 220, cardH, ACCENT_SOFT);
    addStrokeRect(page, summaryX, summaryTop - cardH, 220, cardH, ACCENT);
    
    let currentY = summaryTop - 28;
    addText(page, fonts, "Subtotal", summaryX + 16, currentY, 10, "semibold", ACCENT);
    addText(page, fonts, formatPdfCurrency(subtotal, activePdfCurrency), summaryX + 204, currentY, 10, "bold", TEXT, "right");
    
    if (hasDiscount) {
      currentY -= 22;
      addText(page, fonts, `Discount ${discountType === "percent" ? `(${discountVal}%)` : ""}`, summaryX + 16, currentY, 10, "semibold", ACCENT);
      addText(page, fonts, `-${formatPdfCurrency(discountAmount, activePdfCurrency)}`, summaryX + 204, currentY, 10, "bold", WARNING, "right");
    }
    
    currentY -= 24;
    addText(page, fonts, "Paid", summaryX + 16, currentY, 10, "semibold", ACCENT);
    addText(page, fonts, formatPdfCurrency(amountPaid, activePdfCurrency), summaryX + 204, currentY, 10, "bold", TEXT, "right");
    
    currentY -= 20;
    addLine(page, summaryX + 16, currentY, summaryX + 204, currentY, ACCENT);
    
    currentY -= 25;
    addText(page, fonts, "Balance due", summaryX + 16, currentY, 13, "bold", ACCENT);
    addText(page, fonts, formatPdfCurrency(balanceDue, activePdfCurrency), summaryX + 204, currentY, 13, "bold", TEXT, "right");
    y = currentY - 49;
  } else {
    addRect(page, summaryX, summaryTop - cardH, 220, cardH, WHITE);
    addStrokeRect(page, summaryX, summaryTop - cardH, 220, cardH, BORDER);
    
    let currentY = summaryTop - 28;
    addText(page, fonts, "Subtotal", summaryX + 16, currentY, 10, "regular", MUTED);
    addText(page, fonts, formatPdfCurrency(subtotal, activePdfCurrency), summaryX + 204, currentY, 10, "regular", TEXT, "right");
    
    if (hasDiscount) {
      currentY -= 22;
      addText(page, fonts, `Discount ${discountType === "percent" ? `(${discountVal}%)` : ""}`, summaryX + 16, currentY, 10, "regular", MUTED);
      addText(page, fonts, `-${formatPdfCurrency(discountAmount, activePdfCurrency)}`, summaryX + 204, currentY, 10, "regular", WARNING, "right");
    }
    
    currentY -= 24;
    addText(page, fonts, "Paid", summaryX + 16, currentY, 10, "regular", MUTED);
    addText(page, fonts, formatPdfCurrency(amountPaid, activePdfCurrency), summaryX + 204, currentY, 10, "regular", TEXT, "right");
    
    currentY -= 20;
    addLine(page, summaryX + 16, currentY, summaryX + 204, currentY);
    
    currentY -= 25;
    addText(page, fonts, "Balance due", summaryX + 16, currentY, 13, "bold", TEXT);
    addText(page, fonts, formatPdfCurrency(balanceDue, activePdfCurrency), summaryX + 204, currentY, 13, "bold", TEXT, "right");
    y = currentY - 49;
  }

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

async function createOutsourcingInvoicePdfBlob(invoice: OutsourcingInvoice, profile: UserProfile | null, currency: string) {
  const pdf = await PDFDocument.create();
  const fonts = await embedGoogleSansFlex(pdf);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - PAGE_MARGIN;
  const businessName = profile?.businessName || profile?.name || "BillCraft";
  const invoiceTotal = typeof invoice.total === "number" ? invoice.total : getInvoiceItemsTotal(invoice.items || []);
  const amountPaid = getAmountPaid(invoice);
  const balanceDue = getBalanceDue(invoice);
  const paymentState = getPaymentState(invoice);
  const statusTone = statusColor(invoice.status);

  function drawFooter(currentPage: PDFPage, pageIndex: number) {
    addLine(currentPage, PAGE_MARGIN, 48, PAGE_WIDTH - PAGE_MARGIN, 48, rgb(0.9, 0.91, 0.94));
    addText(currentPage, fonts, `${businessName} | Outsourcing Payable ${invoice.id}`, PAGE_MARGIN, 30, 8, "regular", MUTED);
    addText(currentPage, fonts, `Page ${pageIndex + 1} of ${pdf.getPageCount()}`, PAGE_WIDTH - PAGE_MARGIN, 30, 8, "regular", MUTED, "right");
  }

  function drawTableHeader(currentPage: PDFPage, headerY: number) {
    addRect(currentPage, PAGE_MARGIN, headerY - 24, CONTENT_WIDTH, 28, INK);
    addText(currentPage, fonts, "WORK PURCHASED", PAGE_MARGIN + 14, headerY - 14, 8.5, "bold", WHITE);
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

  const issuerLines = [
    businessName,
    profile?.profession,
    profile?.email,
    profile?.phone,
  ].filter(Boolean) as string[];
  const vendorLines = [
    invoice.vendor,
    invoice.company,
    invoice.email,
    invoice.phone,
    invoice.address,
  ].filter(Boolean) as string[];

  addRect(page, 0, PAGE_HEIGHT - 18, PAGE_WIDTH, 18, MUTED);
  addRect(page, PAGE_MARGIN, y - 41, 42, 42, MUTED);
  addText(page, fonts, businessInitials(invoice.vendor), PAGE_MARGIN + 21, y - 26, 13, "bold", WHITE, "center");
  addText(page, fonts, invoice.vendor, PAGE_MARGIN + 56, y - 8, 15, "bold", TEXT);
  addText(page, fonts, invoice.company || "Subcontractor / Vendor", PAGE_MARGIN + 56, y - 26, 9.5, "regular", MUTED);
  addText(page, fonts, [invoice.email, invoice.phone].filter(Boolean).join(" | "), PAGE_MARGIN + 56, y - 40, 8.5, "regular", MUTED);
  addText(page, fonts, "PAYMENT VOUCHER", PAGE_WIDTH - PAGE_MARGIN, y - 4, 22, "bold", TEXT, "right");
  addText(page, fonts, invoice.id, PAGE_WIDTH - PAGE_MARGIN, y - 24, 10.5, "semibold", MUTED, "right");
  addRect(page, PAGE_WIDTH - PAGE_MARGIN - 104, y - 48, 104, 20, statusTone);
  addText(page, fonts, paymentState.toUpperCase(), PAGE_WIDTH - PAGE_MARGIN - 52, y - 42, 8, "bold", WHITE, "center");
  y -= 78;

  addRect(page, PAGE_MARGIN, y - 88, CONTENT_WIDTH, 88, SOFT);
  addText(page, fonts, "TOTAL PAYABLE VALUE", PAGE_MARGIN + 20, y - 26, 8.5, "bold", MUTED);
  addText(page, fonts, formatPdfCurrency(invoiceTotal, currency), PAGE_MARGIN + 20, y - 57, 24, "bold", TEXT);
  addText(page, fonts, "Voucher date", PAGE_WIDTH - PAGE_MARGIN - 178, y - 25, 8.5, "bold", MUTED);
  addText(page, fonts, invoice.date || "Not set", PAGE_WIDTH - PAGE_MARGIN - 178, y - 43, 10, "bold", TEXT);
  addText(page, fonts, "Due date", PAGE_WIDTH - PAGE_MARGIN - 70, y - 25, 8.5, "bold", MUTED);
  addText(page, fonts, invoice.dueDate || "No due date", PAGE_WIDTH - PAGE_MARGIN - 70, y - 43, 10, "bold", TEXT);
  addText(page, fonts, invoice.templateName || "Outsourcing Voucher", PAGE_WIDTH - PAGE_MARGIN - 20, y - 68, 8.5, "regular", MUTED, "right");
  y -= 120;

  const cardGap = 18;
  const cardWidth = (CONTENT_WIDTH - cardGap) / 2;
  const cardHeight = 132;
  addRect(page, PAGE_MARGIN, y - cardHeight, cardWidth, cardHeight, WHITE);
  addStrokeRect(page, PAGE_MARGIN, y - cardHeight, cardWidth, cardHeight);
  addRect(page, PAGE_MARGIN + cardWidth + cardGap, y - cardHeight, cardWidth, cardHeight, WHITE);
  addStrokeRect(page, PAGE_MARGIN + cardWidth + cardGap, y - cardHeight, cardWidth, cardHeight);
  addText(page, fonts, "ISSUER", PAGE_MARGIN + 16, y - 24, 8.5, "bold", MUTED);
  addText(page, fonts, "PAY TO", PAGE_MARGIN + cardWidth + cardGap + 16, y - 24, 8.5, "bold", MUTED);
  addTextBlock(page, fonts, issuerLines, PAGE_MARGIN + 16, y - 46, 31);
  addTextBlock(page, fonts, vendorLines, PAGE_MARGIN + cardWidth + cardGap + 16, y - 46, 31);
  y -= cardHeight + 34;

  drawTableHeader(page, y);
  y -= 44;

  const items = invoice.items && invoice.items.length > 0
    ? invoice.items
    : [{ id: "total", description: "Payable total", quantity: 1, price: invoiceTotal }];

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
  addText(page, fonts, "Payment details", PAGE_MARGIN, y, 10, "bold", TEXT);
  y -= 16;
  addText(page, fonts, `Reference voucher: ${invoice.id}`, PAGE_MARGIN, y, 9.5, "regular", MUTED);
  y -= 15;
  addText(page, fonts, invoice.dueDate ? `Payment due date: ${invoice.dueDate}.` : "No due date was set for this voucher.", PAGE_MARGIN, y, 9.5, "regular", MUTED);

  const summaryX = PAGE_WIDTH - PAGE_MARGIN - 220;
  const summaryTop = y + 44;
  addRect(page, summaryX, summaryTop - 122, 220, 122, WHITE);
  addStrokeRect(page, summaryX, summaryTop - 122, 220, 122);
  addText(page, fonts, "Subtotal", summaryX + 16, summaryTop - 28, 10, "regular", MUTED);
  addText(page, fonts, formatPdfCurrency(invoice.subtotal || invoiceTotal, currency), summaryX + 204, summaryTop - 28, 10, "regular", TEXT, "right");
  addText(page, fonts, "Paid", summaryX + 16, summaryTop - 52, 10, "regular", MUTED);
  addText(page, fonts, formatPdfCurrency(amountPaid, currency), summaryX + 204, summaryTop - 52, 10, "regular", TEXT, "right");
  addLine(page, summaryX + 16, summaryTop - 72, summaryX + 204, summaryTop - 72);
  addText(page, fonts, "Balance due", summaryX + 16, summaryTop - 97, 13, "bold", TEXT);
  addText(page, fonts, formatPdfCurrency(balanceDue, currency), summaryX + 204, summaryTop - 97, 13, "bold", TEXT, "right");
  y = summaryTop - 146;

  y = Math.max(y - 12, PAGE_BOTTOM + 18);
  addText(page, fonts, "Outsourcing payable record. Thank you for your partnership.", PAGE_MARGIN, y, 10.5, "semibold", TEXT);

  pdf.getPages().forEach((currentPage, index) => {
    drawFooter(currentPage, index);
  });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export async function exportOutsourcingInvoicePdf(invoice: OutsourcingInvoice, profile: UserProfile | null, currency: string) {
  const blob = await createOutsourcingInvoicePdfBlob(invoice, profile, currency);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${invoice.id.replace("#", "").toUpperCase()}_VOUCHER.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

async function createClientStatementPdfBlob(
  client: Client & { invoices: Invoice[] },
  profile: UserProfile | null,
  currency: string
) {
  const pdf = await PDFDocument.create();
  const fonts = await embedGoogleSansFlex(pdf);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - PAGE_MARGIN;
  const businessName = profile?.businessName || profile?.name || "BillCraft";

  // Calculate metrics
  const invoices = client.invoices || [];
  const totalBilled = invoices.reduce((sum, inv) => sum + getInvoiceTotal(inv), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + getAmountPaid(inv), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + getBalanceDue(inv), 0);
  
  // Overdue calculations
  const totalOverdue = invoices
    .filter(inv => getPaymentState(inv) === "Overdue" || isDueDateOverdue(inv.dueDate))
    .reduce((sum, inv) => sum + getBalanceDue(inv), 0);

  // Aging buckets
  let currentBucket = 0;
  let over1to30 = 0;
  let over31to60 = 0;
  let over61to90 = 0;
  let over90 = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  invoices.forEach((inv) => {
    const balance = getBalanceDue(inv);
    if (balance <= 0) return;

    if (!inv.dueDate) {
      currentBucket += balance;
      return;
    }

    const due = new Date(inv.dueDate);
    if (Number.isNaN(due.getTime())) {
      currentBucket += balance;
      return;
    }

    due.setHours(0, 0, 0, 0);

    if (due >= today) {
      currentBucket += balance;
    } else {
      const diffTime = Math.abs(today.getTime() - due.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) {
        over1to30 += balance;
      } else if (diffDays <= 60) {
        over31to60 += balance;
      } else if (diffDays <= 90) {
        over61to90 += balance;
      } else {
        over90 += balance;
      }
    }
  });

  function drawFooter(currentPage: PDFPage, pageIndex: number) {
    addLine(currentPage, PAGE_MARGIN, 48, PAGE_WIDTH - PAGE_MARGIN, 48, rgb(0.9, 0.91, 0.94));
    addText(currentPage, fonts, `${businessName} | Statement of Accounts: ${client.name}`, PAGE_MARGIN, 30, 8, "regular", MUTED);
    addText(currentPage, fonts, `Page ${pageIndex + 1} of ${pdf.getPageCount()}`, PAGE_WIDTH - PAGE_MARGIN, 30, 8, "regular", MUTED, "right");
  }

  function drawTableHeader(currentPage: PDFPage, headerY: number) {
    addRect(currentPage, PAGE_MARGIN, headerY - 24, CONTENT_WIDTH, 28, INK);
    addText(currentPage, fonts, "DATE", PAGE_MARGIN + 14, headerY - 14, 8.5, "bold", WHITE);
    addText(currentPage, fonts, "INVOICE ID", PAGE_MARGIN + 110, headerY - 14, 8.5, "bold", WHITE);
    addText(currentPage, fonts, "STATUS", PAGE_MARGIN + 210, headerY - 14, 8.5, "bold", WHITE);
    addText(currentPage, fonts, "AMOUNT", PAGE_WIDTH - PAGE_MARGIN - 170, headerY - 14, 8.5, "bold", WHITE, "right");
    addText(currentPage, fonts, "PAID", PAGE_WIDTH - PAGE_MARGIN - 92, headerY - 14, 8.5, "bold", WHITE, "right");
    addText(currentPage, fonts, "BALANCE DUE", PAGE_WIDTH - PAGE_MARGIN - 14, headerY - 14, 8.5, "bold", WHITE, "right");
  }

  function addPage() {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - PAGE_MARGIN;
    addText(page, fonts, businessName, PAGE_MARGIN, y, 12, "semibold", TEXT);
    addText(page, fonts, `Statement for ${client.name} continued`, PAGE_WIDTH - PAGE_MARGIN, y, 10, "semibold", MUTED, "right");
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

  // Header Banner
  addRect(page, 0, PAGE_HEIGHT - 18, PAGE_WIDTH, 18, ACCENT);
  addRect(page, PAGE_MARGIN, y - 41, 42, 42, ACCENT);
  addText(page, fonts, businessInitials(client.name), PAGE_MARGIN + 21, y - 26, 13, "bold", WHITE, "center");
  addText(page, fonts, client.name, PAGE_MARGIN + 56, y - 8, 15, "bold", TEXT);
  addText(page, fonts, client.company || "Statement of Accounts", PAGE_MARGIN + 56, y - 26, 9.5, "regular", MUTED);
  addText(page, fonts, [client.email, client.phone].filter(Boolean).join(" | "), PAGE_MARGIN + 56, y - 40, 8.5, "regular", MUTED);
  addText(page, fonts, "STATEMENT", PAGE_WIDTH - PAGE_MARGIN, y - 4, 25, "bold", TEXT, "right");
  addText(page, fonts, `Generated on ${formatPdfDate(new Date())}`, PAGE_WIDTH - PAGE_MARGIN, y - 24, 10, "semibold", MUTED, "right");
  y -= 78;

  // Overview Cards
  const totalCardsWidth = CONTENT_WIDTH;
  const cardGap = 12;
  const numCards = 4;
  const singleCardWidth = (totalCardsWidth - (cardGap * (numCards - 1))) / numCards;
  const overviewCardHeight = 64;

  const cardData = [
    { label: "TOTAL BILLED", value: totalBilled, bg: SOFT, color: TEXT },
    { label: "TOTAL COLLECTED", value: totalPaid, bg: ACCENT_SOFT, color: ACCENT },
    { label: "OUTSTANDING", value: totalOutstanding, bg: SOFT, color: TEXT },
    { label: "OVERDUE BALANCE", value: totalOverdue, bg: rgb(1, 0.95, 0.95), color: WARNING },
  ];

  cardData.forEach((card, idx) => {
    const cardX = PAGE_MARGIN + idx * (singleCardWidth + cardGap);
    addRect(page, cardX, y - overviewCardHeight, singleCardWidth, overviewCardHeight, card.bg);
    addStrokeRect(page, cardX, y - overviewCardHeight, singleCardWidth, overviewCardHeight, BORDER);
    addText(page, fonts, card.label, cardX + 10, y - 18, 7.5, "bold", MUTED);
    addText(page, fonts, formatPdfCurrency(card.value, currency), cardX + 10, y - 44, 11.5, "bold", card.color);
  });
  y -= overviewCardHeight + 24;

  // Aging Analysis Schedule
  const agingCardHeight = 64;
  const numAging = 5;
  const agingWidth = (totalCardsWidth - (cardGap * (numAging - 1))) / numAging;

  addText(page, fonts, "AGING SCHEDULE (OUTSTANDING BALANCES)", PAGE_MARGIN, y, 9, "bold", TEXT);
  y -= 16;

  const agingData = [
    { label: "Current", value: currentBucket },
    { label: "1 - 30 Days", value: over1to30 },
    { label: "31 - 60 Days", value: over31to60 },
    { label: "61 - 90 Days", value: over61to90 },
    { label: "90+ Days", value: over90 },
  ];

  agingData.forEach((bucket, idx) => {
    const ageX = PAGE_MARGIN + idx * (agingWidth + cardGap);
    const hasBalance = bucket.value > 0;
    addRect(page, ageX, y - agingCardHeight, agingWidth, agingCardHeight, hasBalance ? ACCENT_SOFT : WHITE);
    addStrokeRect(page, ageX, y - agingCardHeight, agingWidth, agingCardHeight, hasBalance ? ACCENT : BORDER);
    addText(page, fonts, bucket.label, ageX + 10, y - 18, 8, "semibold", hasBalance ? ACCENT : MUTED);
    addText(page, fonts, formatPdfCurrency(bucket.value, currency), ageX + 10, y - 44, 10, "bold", hasBalance ? TEXT : MUTED);
  });
  y -= agingCardHeight + 28;

  // Ledger Table
  drawTableHeader(page, y);
  y -= 44;

  if (invoices.length === 0) {
    addRect(page, PAGE_MARGIN, y - 40, CONTENT_WIDTH, 40, SOFT);
    addText(page, fonts, "No invoice records found for this client.", PAGE_MARGIN + 14, y - 24, 10, "regular", MUTED);
    y -= 40;
  } else {
    invoices.forEach((inv, invIdx) => {
      const rowHeight = 36;
      ensureSpace(rowHeight);

      const rowTop = y;
      const statusText = getPaymentState(inv).toUpperCase();
      const statusTone = statusColor(inv.status);

      addRect(page, PAGE_MARGIN, rowTop - rowHeight + 11, CONTENT_WIDTH, rowHeight, invIdx % 2 === 0 ? SOFT : WHITE);
      
      addText(page, fonts, inv.date, PAGE_MARGIN + 14, rowTop - 12, 9.5, "regular", TEXT);
      addText(page, fonts, inv.id, PAGE_MARGIN + 110, rowTop - 12, 9.5, "semibold", TEXT);
      addText(page, fonts, statusText, PAGE_MARGIN + 210, rowTop - 12, 8.5, "bold", statusTone);
      
      addText(page, fonts, formatPdfCurrency(getInvoiceTotal(inv), currency), PAGE_WIDTH - PAGE_MARGIN - 170, rowTop - 12, 9.5, "regular", TEXT, "right");
      addText(page, fonts, formatPdfCurrency(getAmountPaid(inv), currency), PAGE_WIDTH - PAGE_MARGIN - 92, rowTop - 12, 9.5, "regular", TEXT, "right");
      addText(page, fonts, formatPdfCurrency(getBalanceDue(inv), currency), PAGE_WIDTH - PAGE_MARGIN - 14, rowTop - 12, 9.5, "bold", TEXT, "right");
      
      y -= rowHeight;
      addLine(page, PAGE_MARGIN, y + 11, PAGE_WIDTH - PAGE_MARGIN, y + 11, rgb(0.9, 0.91, 0.94));
    });
  }

  ensureSpace(80);
  y -= 20;
  
  // Notes / Footer Info
  addText(page, fonts, "Summary Statement of Account", PAGE_MARGIN, y, 10.5, "bold", TEXT);
  y -= 16;
  addText(page, fonts, `This is a consolidated statement summarizing all financial billing ledger transactions.`, PAGE_MARGIN, y, 9.5, "regular", MUTED);
  y -= 14;
  addText(page, fonts, `Total Unresolved Outstanding Balance: ${formatPdfCurrency(totalOutstanding, currency)}.`, PAGE_MARGIN, y, 9.5, "semibold", TEXT);

  pdf.getPages().forEach((currentPage, index) => {
    drawFooter(currentPage, index);
  });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export async function exportClientStatementPdf(
  client: Client & { invoices: Invoice[] },
  profile: UserProfile | null,
  currency: string
) {
  const blob = await createClientStatementPdfBlob(client, profile, currency);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `STATEMENT_${client.name.replace(/[^a-z0-9-]+/gi, "").toUpperCase()}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatPdfDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

