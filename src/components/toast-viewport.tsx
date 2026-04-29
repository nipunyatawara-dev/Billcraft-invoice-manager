"use client";

import { useToastPosition } from "@/hooks/use-toast-position";
import { Toaster } from "sileo";

const toastStyles = {
  title: "billcraft-toast-title",
  description: "billcraft-toast-description",
  badge: "billcraft-toast-badge",
  button: "billcraft-toast-button",
};

export function ToastViewport() {
  const { toastPosition } = useToastPosition();

  return (
    <Toaster
      position={toastPosition}
      offset={{ top: 72, right: 16, bottom: 16, left: 16 }}
      options={{
        fill: "var(--featured)",
        roundness: 12,
        styles: toastStyles,
      }}
    />
  );
}
