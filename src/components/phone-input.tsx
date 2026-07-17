"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  formatPhoneNumber,
  getDefaultDialCode,
  parsePhoneNumber,
  PHONE_COUNTRIES,
  type PhoneCountry,
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

function countryLabel(country: PhoneCountry) {
  return `+${country.dial} ${country.code}`;
}

function findCountryByDial(dial: string) {
  return PHONE_COUNTRIES.find((country) => country.dial === dial) || null;
}

function filterCountries(query: string) {
  const cleaned = query.trim().toLowerCase().replace(/^\+/, "");
  if (!cleaned) {
    return PHONE_COUNTRIES;
  }

  const digits = cleaned.replace(/\D/g, "");

  return PHONE_COUNTRIES.filter((country) => {
    const haystack = `${country.dial} ${country.code} ${country.label}`.toLowerCase();
    if (haystack.includes(cleaned)) {
      return true;
    }
    return Boolean(digits) && country.dial.startsWith(digits);
  });
}

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
  const [dialQuery, setDialQuery] = useState(() => {
    const country = findCountryByDial(parsed.dialCode);
    return country ? countryLabel(country) : `+${parsed.dialCode}`;
  });
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const dialInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const next = parsePhoneNumber(value, fallbackDialCode);
    setDialCode(next.dialCode);
    setNationalNumber(next.nationalNumber);
    if (document.activeElement !== dialInputRef.current) {
      const country = findCountryByDial(next.dialCode);
      setDialQuery(country ? countryLabel(country) : `+${next.dialCode}`);
    }
  }, [value, fallbackDialCode]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const matches = useMemo(() => filterCountries(dialQuery), [dialQuery]);

  useEffect(() => {
    setHighlight(0);
  }, [dialQuery, open]);

  function updatePhone(nextDialCode: string, nextNationalNumber: string) {
    const normalizedDial = nextDialCode.replace(/\D/g, "") || fallbackDialCode;
    setDialCode(normalizedDial);
    setNationalNumber(nextNationalNumber);
    onChange(formatPhoneNumber(normalizedDial, nextNationalNumber));
  }

  function selectCountry(country: PhoneCountry) {
    setDialQuery(countryLabel(country));
    setOpen(false);
    updatePhone(country.dial, nationalNumber);
  }

  function commitDialQuery(nextQuery = dialQuery) {
    const digits = nextQuery.replace(/\D/g, "");
    const exact =
      matches.find((country) => country.dial === digits) ||
      PHONE_COUNTRIES.find((country) => country.dial === digits) ||
      matches[0] ||
      findCountryByDial(dialCode);

    if (exact) {
      selectCountry(exact);
      return;
    }

    const fallback = digits || dialCode || fallbackDialCode;
    setDialQuery(`+${fallback}`);
    updatePhone(fallback, nationalNumber);
    setOpen(false);
  }

  function handleDialChange(raw: string) {
    const next = raw.startsWith("+") ? raw : `+${raw.replace(/^\+*/, "")}`;
    setDialQuery(next);
    setOpen(true);

    const digits = next.replace(/\D/g, "");
    if (digits && PHONE_COUNTRIES.some((country) => country.dial === digits)) {
      updatePhone(digits, nationalNumber);
    }
  }

  function handleDialKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => Math.min(current + 1, Math.max(matches.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (open && matches[highlight]) {
        selectCountry(matches[highlight]);
      } else {
        commitDialQuery();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      const country = findCountryByDial(dialCode);
      setDialQuery(country ? countryLabel(country) : `+${dialCode}`);
    }
  }

  return (
    <div ref={rootRef} className={cn("grid grid-cols-[6.25rem_minmax(0,1fr)] gap-2 items-center", className)}>
      <div className="relative min-w-0">
        <input
          ref={dialInputRef}
          id={id ? `${id}-country` : undefined}
          type="text"
          inputMode="text"
          autoComplete="tel-country-code"
          aria-label="Country code"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          role="combobox"
          disabled={disabled}
          value={dialQuery}
          onFocus={() => setOpen(true)}
          onChange={(event) => handleDialChange(event.target.value)}
          onBlur={() => {
            // Defer so option click can fire first.
            window.setTimeout(() => {
              if (document.activeElement !== dialInputRef.current) {
                commitDialQuery();
              }
            }, 120);
          }}
          onKeyDown={handleDialKeyDown}
          placeholder="+1"
          className={cn(
            "field-control !w-full h-11 px-2 text-[12px] leading-none",
            selectClassName,
          )}
        />

        {open && !disabled && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 top-[calc(100%+0.35rem)] z-50 max-h-56 w-[16rem] overflow-y-auto rounded-xl border border-card-border bg-card p-1 shadow-lg"
          >
            {matches.length === 0 ? (
              <li className="px-2.5 py-2 text-xs text-muted">No matching country</li>
            ) : (
              matches.map((country, index) => (
                <li key={`${country.code}-${country.dial}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={highlight === index}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                      highlight === index
                        ? "bg-accent/10 text-accent"
                        : "text-foreground hover:bg-foreground/[0.04]",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => selectCountry(country)}
                  >
                    <span className="font-semibold tabular-nums">
                      +{country.dial} {country.code}
                    </span>
                    <span className="truncate text-muted">{country.label}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

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
          "field-control !w-full h-11 px-3 text-[12.5px] leading-none",
          inputClassName,
        )}
      />
    </div>
  );
}
