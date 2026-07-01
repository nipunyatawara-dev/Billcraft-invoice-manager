export type PhoneCountry = {
  code: string;
  dial: string;
  label: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "US", dial: "1", label: "United States" },
  { code: "CA", dial: "1", label: "Canada" },
  { code: "GB", dial: "44", label: "United Kingdom" },
  { code: "AU", dial: "61", label: "Australia" },
  { code: "DE", dial: "49", label: "Germany" },
  { code: "FR", dial: "33", label: "France" },
  { code: "IT", dial: "39", label: "Italy" },
  { code: "ES", dial: "34", label: "Spain" },
  { code: "NL", dial: "31", label: "Netherlands" },
  { code: "SE", dial: "46", label: "Sweden" },
  { code: "NO", dial: "47", label: "Norway" },
  { code: "DK", dial: "45", label: "Denmark" },
  { code: "FI", dial: "358", label: "Finland" },
  { code: "CH", dial: "41", label: "Switzerland" },
  { code: "AT", dial: "43", label: "Austria" },
  { code: "BE", dial: "32", label: "Belgium" },
  { code: "IE", dial: "353", label: "Ireland" },
  { code: "PT", dial: "351", label: "Portugal" },
  { code: "PL", dial: "48", label: "Poland" },
  { code: "CZ", dial: "420", label: "Czechia" },
  { code: "GR", dial: "30", label: "Greece" },
  { code: "TR", dial: "90", label: "Turkey" },
  { code: "RU", dial: "7", label: "Russia" },
  { code: "UA", dial: "380", label: "Ukraine" },
  { code: "IN", dial: "91", label: "India" },
  { code: "PK", dial: "92", label: "Pakistan" },
  { code: "BD", dial: "880", label: "Bangladesh" },
  { code: "LK", dial: "94", label: "Sri Lanka" },
  { code: "NP", dial: "977", label: "Nepal" },
  { code: "CN", dial: "86", label: "China" },
  { code: "JP", dial: "81", label: "Japan" },
  { code: "KR", dial: "82", label: "South Korea" },
  { code: "SG", dial: "65", label: "Singapore" },
  { code: "MY", dial: "60", label: "Malaysia" },
  { code: "TH", dial: "66", label: "Thailand" },
  { code: "VN", dial: "84", label: "Vietnam" },
  { code: "PH", dial: "63", label: "Philippines" },
  { code: "ID", dial: "62", label: "Indonesia" },
  { code: "AE", dial: "971", label: "United Arab Emirates" },
  { code: "SA", dial: "966", label: "Saudi Arabia" },
  { code: "QA", dial: "974", label: "Qatar" },
  { code: "KW", dial: "965", label: "Kuwait" },
  { code: "IL", dial: "972", label: "Israel" },
  { code: "EG", dial: "20", label: "Egypt" },
  { code: "ZA", dial: "27", label: "South Africa" },
  { code: "NG", dial: "234", label: "Nigeria" },
  { code: "KE", dial: "254", label: "Kenya" },
  { code: "GH", dial: "233", label: "Ghana" },
  { code: "BR", dial: "55", label: "Brazil" },
  { code: "MX", dial: "52", label: "Mexico" },
  { code: "AR", dial: "54", label: "Argentina" },
  { code: "CL", dial: "56", label: "Chile" },
  { code: "CO", dial: "57", label: "Colombia" },
  { code: "PE", dial: "51", label: "Peru" },
  { code: "NZ", dial: "64", label: "New Zealand" },
];

const DIAL_CODES_SORTED = [...new Set(PHONE_COUNTRIES.map((country) => country.dial))].sort(
  (left, right) => right.length - left.length,
);

const LOCALE_DIAL_MAP: Record<string, string> = Object.fromEntries(
  PHONE_COUNTRIES.map((country) => [country.code, country.dial]),
);

export function getDialCodesSorted() {
  return DIAL_CODES_SORTED;
}

export function parsePhoneNumber(raw: string, fallbackDialCode = "1") {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { dialCode: fallbackDialCode, nationalNumber: "" };
  }

  let digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return { dialCode: fallbackDialCode, nationalNumber: "" };
  }

  if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
    if (trimmed.startsWith("00")) {
      digits = digits.slice(2);
    }

    for (const dial of DIAL_CODES_SORTED) {
      if (digits.startsWith(dial)) {
        return {
          dialCode: dial,
          nationalNumber: digits.slice(dial.length),
        };
      }
    }
  }

  if (digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }

  return {
    dialCode: fallbackDialCode,
    nationalNumber: digits,
  };
}

export function formatPhoneNumber(dialCode: string, nationalNumber: string) {
  const national = nationalNumber.replace(/\D/g, "");
  if (!national) {
    return "";
  }

  return `+${dialCode}${national}`;
}

export function getDefaultDialCode(hintPhone?: string) {
  if (hintPhone?.trim()) {
    const parsed = parsePhoneNumber(hintPhone);
    if (parsed.nationalNumber || hintPhone.trim().startsWith("+")) {
      return parsed.dialCode;
    }
  }

  if (typeof navigator !== "undefined") {
    const locale = navigator.language || "";
    const region = locale.split("-")[1]?.toUpperCase();
    if (region && LOCALE_DIAL_MAP[region]) {
      return LOCALE_DIAL_MAP[region];
    }
  }

  return "1";
}
