import type { Invoice, OutsourcingInvoice, UserProfile } from "@/data/invoices";
import { formatPhoneNumber, parsePhoneNumber } from "@/lib/phone-countries";
import { downloadPdfAndCopyMessage, sharePdfDocument } from "@/lib/share-document";
import {
  buildWhatsAppShareUrl,
  isMobileShareDevice,
  openWhatsAppShareUrl,
  resolveWhatsAppPhone,
  type WhatsAppTarget,
} from "@/lib/whatsapp-phone";

export type ShareChannel = "message" | "whatsapp" | "gmail";

const ATTACHMENT_NOTE = "\n\nI've attached the PDF — please add the downloaded file to your message.";

function buildSmsUrl(phone: string, message: string) {
  const body = message + ATTACHMENT_NOTE;
  const parsed = parsePhoneNumber(phone);
  const formatted = formatPhoneNumber(parsed.dialCode, parsed.nationalNumber);
  return `sms:${formatted}?body=${encodeURIComponent(body)}`;
}

function buildMailtoUrl(email: string, subject: string, message: string) {
  const body = message + ATTACHMENT_NOTE;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function getShareDescription(channel: ShareChannel) {
  if (channel === "message") {
    return "PDF saved and message copied. Attach the file in your text.";
  }

  if (channel === "whatsapp") {
    return "PDF saved and message copied. Attach the file in WhatsApp before sending.";
  }

  return "PDF saved and message copied. Attach the file in your email before sending.";
}

export function openWhatsAppChannelNow(options: {
  whatsapp?: string;
  phone?: string;
  profilePhone?: string;
  message: string;
  target: WhatsAppTarget;
}) {
  if (isMobileShareDevice() && options.target !== "mobile") {
    options = { ...options, target: "mobile" };
  }

  const normalizedPhone = resolveWhatsAppPhone({
    whatsapp: options.whatsapp,
    phone: options.phone,
    profilePhone: options.profilePhone,
  });

  if (!normalizedPhone) {
    return;
  }

  const url = buildWhatsAppShareUrl(
    normalizedPhone,
    options.message + ATTACHMENT_NOTE,
    options.target,
  );

  openWhatsAppShareUrl(url, options.target);
}

/** Open the target app immediately (sync) so popup blockers don't block after PDF generation. */
export function openShareChannelNow(
  channel: ShareChannel,
  options: {
    message: string;
    phone?: string;
    whatsapp?: string;
    profilePhone?: string;
    email?: string;
    subject: string;
    whatsappTarget?: WhatsAppTarget;
  },
) {
  if (isMobileShareDevice() && channel === "whatsapp") {
    openWhatsAppChannelNow({
      whatsapp: options.whatsapp,
      phone: options.phone,
      profilePhone: options.profilePhone,
      message: options.message,
      target: "mobile",
    });
    return;
  }

  if (channel === "whatsapp") {
    openWhatsAppChannelNow({
      whatsapp: options.whatsapp,
      phone: options.phone,
      profilePhone: options.profilePhone,
      message: options.message,
      target: options.whatsappTarget || "web",
    });
    return;
  }

  if (channel === "message" && options.phone) {
    window.location.assign(buildSmsUrl(options.phone, options.message));
    return;
  }

  if (channel === "gmail" && options.email) {
    window.location.assign(buildMailtoUrl(options.email, options.subject, options.message));
  }
}

async function shareBillablePdf(options: {
  channel: ShareChannel;
  blob: Blob;
  fileName: string;
  title: string;
  message: string;
  downloadTitle: string;
}) {
  const { channel, blob, fileName, title, message, downloadTitle } = options;
  const copyText = message + ATTACHMENT_NOTE;

  await sharePdfDocument({
    blob,
    fileName,
    title,
    text: message,
    copyText,
    downloadTitle,
    downloadDescription: getShareDescription(channel),
  });
}

export async function shareInvoicePdf(
  channel: ShareChannel,
  invoice: Invoice,
  profile: UserProfile | null,
  currency: string,
  message: string,
) {
  const { createInvoicePdfBlob, invoiceFileName } = await import("@/lib/pdf-export");
  const blob = await createInvoicePdfBlob(invoice, profile, currency);

  await shareBillablePdf({
    channel,
    blob,
    fileName: invoiceFileName(invoice),
    title: `Invoice ${invoice.id}`,
    message,
    downloadTitle: "Invoice PDF downloaded",
  });
}

export async function shareOutsourcingPdf(
  channel: ShareChannel,
  invoice: OutsourcingInvoice,
  profile: UserProfile | null,
  currency: string,
  message: string,
) {
  const { createOutsourcingInvoicePdfBlob, outsourcingInvoiceFileName } = await import("@/lib/pdf-export");
  const blob = await createOutsourcingInvoicePdfBlob(invoice, profile, currency);

  await shareBillablePdf({
    channel,
    blob,
    fileName: outsourcingInvoiceFileName(invoice),
    title: `Payable ${invoice.id}`,
    message,
    downloadTitle: "Payable PDF downloaded",
  });
}

export async function downloadInvoicePdfWithMessage(
  invoice: Invoice,
  profile: UserProfile | null,
  currency: string,
  message: string,
) {
  const { createInvoicePdfBlob, invoiceFileName } = await import("@/lib/pdf-export");
  const blob = await createInvoicePdfBlob(invoice, profile, currency);

  await downloadPdfAndCopyMessage({
    blob,
    fileName: invoiceFileName(invoice),
    message: message + ATTACHMENT_NOTE,
    downloadTitle: "Invoice PDF downloaded",
  });
}

export async function downloadOutsourcingPdfWithMessage(
  invoice: OutsourcingInvoice,
  profile: UserProfile | null,
  currency: string,
  message: string,
) {
  const { createOutsourcingInvoicePdfBlob, outsourcingInvoiceFileName } = await import("@/lib/pdf-export");
  const blob = await createOutsourcingInvoicePdfBlob(invoice, profile, currency);

  await downloadPdfAndCopyMessage({
    blob,
    fileName: outsourcingInvoiceFileName(invoice),
    message: message + ATTACHMENT_NOTE,
    downloadTitle: "Payable PDF downloaded",
  });
}
