"use client";

import { useCallback, useEffect, useState } from "react";

export const CURRENCIES = [
  { code: "LKR", label: "Sri Lankan Rupee" },
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "INR", label: "Indian Rupee" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "AED", label: "UAE Dirham" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

const STORAGE_KEY = "billcraft.currency.v1";
const MODE_STORAGE_KEY = "billcraft.currency-mode.v1";
const CHANGE_EVENT = "billcraft:currency-change";
const MODE_CHANGE_EVENT = "billcraft:currency-mode-change";

function isCurrencyCode(value: string): value is CurrencyCode {
  return CURRENCIES.some((currency) => currency.code === value);
}

function getStoredCurrency(): CurrencyCode {
  if (typeof window === "undefined") {
    return "USD";
  }

  const storedCurrency = window.localStorage.getItem(STORAGE_KEY);
  return storedCurrency && isCurrencyCode(storedCurrency) ? storedCurrency : "USD";
}

function getStoredCurrencyMode(): "visual" | "convert" {
  if (typeof window === "undefined") {
    return "visual";
  }

  const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY);
  return storedMode === "convert" ? "convert" : "visual";
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [currencyMode, setCurrencyModeState] = useState<"visual" | "convert">("visual");

  useEffect(() => {
    const loadStoredCurrency = window.setTimeout(() => {
      setCurrencyState(getStoredCurrency());
      setCurrencyModeState(getStoredCurrencyMode());
    }, 0);

    function syncCurrency() {
      setCurrencyState(getStoredCurrency());
      setCurrencyModeState(getStoredCurrencyMode());
    }

    window.addEventListener(CHANGE_EVENT, syncCurrency);
    window.addEventListener(MODE_CHANGE_EVENT, syncCurrency);
    window.addEventListener("storage", syncCurrency);

    return () => {
      window.clearTimeout(loadStoredCurrency);
      window.removeEventListener(CHANGE_EVENT, syncCurrency);
      window.removeEventListener(MODE_CHANGE_EVENT, syncCurrency);
      window.removeEventListener("storage", syncCurrency);
    };
  }, []);

  const setCurrency = useCallback((nextCurrency: CurrencyCode) => {
    window.localStorage.setItem(STORAGE_KEY, nextCurrency);
    setCurrencyState(nextCurrency);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const setCurrencyMode = useCallback((nextMode: "visual" | "convert") => {
    window.localStorage.setItem(MODE_STORAGE_KEY, nextMode);
    setCurrencyModeState(nextMode);
    window.dispatchEvent(new Event(MODE_CHANGE_EVENT));
  }, []);

  return { currency, setCurrency, currencyMode, setCurrencyMode };
}
