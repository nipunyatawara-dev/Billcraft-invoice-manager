"use client";

import { Toaster } from "sileo";

const toastStyles = {
  description: "billcraft-toast-description",
  badge: "billcraft-toast-badge",
  button: "billcraft-toast-button",
};

export function ToastViewport() {
  return (
    <Toaster
      position="top-right"
      offset={{ top: 72, right: 16 }}
      options={{
        fill: "var(--card)",
        roundness: 12,
        styles: toastStyles,
      }}
    />
  );
}
