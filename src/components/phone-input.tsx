"use client";

import { useEffect, useId, useState } from "react";
import {
  formatPhoneNumber,
  getDefaultDialCode,
  parsePhoneNumber,
  PHONE_COUNTRIES,
} from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

type PhoneInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  hintPhone?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
};

export function PhoneInput({
  id,
  value,
  onChange,
  hintPhone,
  placeholder = "771234567",
  disabled = false,
  className,
  selectClassName,
  inputClassName,
}: PhoneInputProps) {
  const fallbackDialCode = getDefaultDialCode(hintPhone);
  const parsed = parsePhoneNumber(value, fallbackDialCode);
  const [dialCode, setDialCode] = useState(parsed.dialCode);
  const [nationalNumber, setNationalNumber] = useState(parsed.nationalNumber);
  const listId = useId();

  useEffect(() => {
    const next = parsePhoneNumber(value, fallbackDialCode);
    setDialCode(next.dialCode);
    setNationalNumber(next.nationalNumber);
  }, [value, fallbackDialCode]);

  function updatePhone(nextDialCode: string, nextNationalNumber: string) {
    setDialCode(nextDialCode);
    setNationalNumber(nextNationalNumber);
    onChange(formatPhoneNumber(nextDialCode, nextNationalNumber));
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <select
        id={id ? `${id}-country` : undefined}
        aria-label="Country code"
        disabled={disabled}
        value={dialCode}
        onChange={(event) => updatePhone(event.target.value, nationalNumber)}
        className={cn(
          "field-control shrink-0 w-[6.75rem] cursor-pointer px-2 py-2 text-[12px] bg-foreground/[0.01]",
          selectClassName,
        )}
      >
        {PHONE_COUNTRIES.map((country) => (
          <option key={`${listId}-${country.code}`} value={country.dial}>
            +{country.dial} {country.code}
          </option>
        ))}
      </select>

      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        value={nationalNumber}
        onChange={(event) => updatePhone(dialCode, event.target.value.replace(/[^\d\s()-]/g, ""))}
        placeholder={placeholder}
        className={cn(
          "field-control min-w-0 flex-1 px-3 py-2 text-[12.5px] bg-foreground/[0.01]",
          inputClassName,
        )}
      />
    </div>
  );
}
