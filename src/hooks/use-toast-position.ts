"use client";

import type { SileoPosition } from "sileo";
import { useCallback, useEffect, useState } from "react";

export const TOAST_POSITIONS = [
  { id: "top-right", label: "Top right", icon: "north_east" },
  { id: "top-center", label: "Top middle", icon: "north" },
  { id: "top-left", label: "Top left", icon: "north_west" },
  { id: "bottom-left", label: "Bottom left", icon: "south_west" },
  { id: "bottom-center", label: "Bottom middle", icon: "south" },
  { id: "bottom-right", label: "Bottom right", icon: "south_east" },
] as const satisfies readonly { id: SileoPosition; label: string; icon: string }[];

export type ToastPosition = (typeof TOAST_POSITIONS)[number]["id"];

export const DEFAULT_TOAST_POSITION: ToastPosition = "top-right";
export const TOAST_POSITION_STORAGE_KEY = "billcraft.toast-position.v1";

const CHANGE_EVENT = "billcraft:toast-position-change";
const TOAST_POSITION_IDS = TOAST_POSITIONS.map((position) => position.id);

function isToastPosition(value: string | null): value is ToastPosition {
  return TOAST_POSITION_IDS.some((positionId) => positionId === value);
}

function getStoredToastPosition(): ToastPosition {
  if (typeof window === "undefined") {
    return DEFAULT_TOAST_POSITION;
  }

  const storedPosition = window.localStorage.getItem(TOAST_POSITION_STORAGE_KEY);
  return isToastPosition(storedPosition) ? storedPosition : DEFAULT_TOAST_POSITION;
}

export function useToastPosition() {
  const [toastPosition, setToastPositionState] = useState<ToastPosition>(DEFAULT_TOAST_POSITION);

  useEffect(() => {
    function syncToastPosition() {
      setToastPositionState(getStoredToastPosition());
    }

    syncToastPosition();
    window.addEventListener(CHANGE_EVENT, syncToastPosition);
    window.addEventListener("storage", syncToastPosition);

    return () => {
      window.removeEventListener(CHANGE_EVENT, syncToastPosition);
      window.removeEventListener("storage", syncToastPosition);
    };
  }, []);

  const setToastPosition = useCallback((nextPosition: ToastPosition) => {
    window.localStorage.setItem(TOAST_POSITION_STORAGE_KEY, nextPosition);
    setToastPositionState(nextPosition);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { toastPosition, setToastPosition };
}
