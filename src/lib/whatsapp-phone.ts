import {
  formatPhoneNumber,
  getDefaultDialCode,
  parsePhoneNumber,
} from "@/lib/phone-countries";

export type WhatsAppTarget = "web" | "desktop" | "mobile";

export function inferCountryCallingCode(phoneWithCountryPrefix: string): string | undefined {
  const trimmed = phoneWithCountryPrefix.trim();
  if (!trimmed.startsWith("+") && !trimmed.startsWith("00")) {
    return undefined;
  }

  return parsePhoneNumber(trimmed).dialCode;
}

export function normalizeWhatsAppPhone(raw: string, fallbackCountryCode?: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  const defaultDial = fallbackCountryCode || getDefaultDialCode();
  const parsed = parsePhoneNumber(trimmed, defaultDial);
  return formatPhoneNumber(parsed.dialCode, parsed.nationalNumber).replace(/^\+/, "");
}

export function resolveWhatsAppPhone(options: {
  whatsapp?: string;
  phone?: string;
  profilePhone?: string;
}): string {
  const raw = options.whatsapp?.trim() || options.phone?.trim() || "";
  const fallbackCountryCode = options.profilePhone
    ? inferCountryCallingCode(options.profilePhone)
    : undefined;

  return normalizeWhatsAppPhone(raw, fallbackCountryCode);
}

export function buildWhatsAppShareUrl(
  normalizedPhone: string,
  message: string,
  target: WhatsAppTarget,
): string {
  const text = encodeURIComponent(message);

  if (target === "desktop") {
    return `whatsapp://send?phone=${normalizedPhone}&text=${text}`;
  }

  if (target === "web") {
    return `https://web.whatsapp.com/send?phone=${normalizedPhone}&text=${text}`;
  }

  return `https://wa.me/${normalizedPhone}?text=${text}`;
}

export function isMobileShareDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function openWhatsAppShareUrl(url: string, target: WhatsAppTarget) {
  if (target === "desktop") {
    window.location.assign(url);
    return;
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.assign(url);
  }
}
