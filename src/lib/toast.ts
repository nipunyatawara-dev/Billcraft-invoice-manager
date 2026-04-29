"use client";

import type { ReactNode } from "react";
import { sileo, type SileoOptions, type SileoPosition } from "sileo";

type ToastMessage = Omit<SileoOptions, "description" | "duration" | "title"> & {
  title: string;
  description?: ReactNode | string;
  duration?: number | null;
};

type PromiseToastMessages<T> = {
  loading: ToastMessage;
  success: ToastMessage | ((data: T) => ToastMessage);
  error?: ToastMessage | ((error: unknown) => ToastMessage);
  action?: ToastMessage | ((data: T) => ToastMessage);
  position?: SileoPosition;
};

const DEFAULT_DURATION = 5600;
const ERROR_DURATION = 7600;

export function getToastErrorMessage(error: unknown, fallback = "Please try that again.") {
  return error instanceof Error && error.message ? error.message : fallback;
}

function withDuration(message: ToastMessage, duration: number | null): SileoOptions {
  return {
    duration,
    ...message,
  };
}

function resolveMessage<T>(message: ToastMessage | ((value: T) => ToastMessage), value: T) {
  return typeof message === "function" ? message(value) : message;
}

export const notify = {
  success(message: ToastMessage) {
    return sileo.success(withDuration(message, message.duration ?? DEFAULT_DURATION));
  },
  error(message: ToastMessage) {
    return sileo.error(withDuration(message, message.duration ?? ERROR_DURATION));
  },
  warning(message: ToastMessage) {
    return sileo.warning(withDuration(message, message.duration ?? DEFAULT_DURATION));
  },
  info(message: ToastMessage) {
    return sileo.info(withDuration(message, message.duration ?? DEFAULT_DURATION));
  },
};

export function notifyPromise<T>(promise: Promise<T>, messages: PromiseToastMessages<T>) {
  return sileo.promise(promise, {
    position: messages.position,
    loading: withDuration(messages.loading, null),
    success: (data) => withDuration(resolveMessage(messages.success, data), DEFAULT_DURATION),
    error: (error) => withDuration(
      messages.error
        ? resolveMessage(messages.error, error)
        : {
          title: "Action failed",
          description: getToastErrorMessage(error),
        },
      ERROR_DURATION,
    ),
    action: messages.action
      ? (data) => withDuration(resolveMessage(messages.action as ToastMessage | ((value: T) => ToastMessage), data), DEFAULT_DURATION)
      : undefined,
  });
}
