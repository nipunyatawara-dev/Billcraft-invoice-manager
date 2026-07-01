"use client";

import * as React from "react";
import { AnimatedText } from "@/components/animated-text";
import { ChevronDown, X } from "lucide-react";

const MAX_WIDTH_CLASS = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
} as const;

export type WorkspaceMaxWidth = keyof typeof MAX_WIDTH_CLASS;

interface ModalOverlayProps {
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: string;
}

export function ModalOverlay({ onClose, children, zIndex = "z-[100]" }: ModalOverlayProps) {
  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4`}>
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      {children}
    </div>
  );
}

export interface WorkspaceFooterActions {
  cancelLabel?: string;
  submitLabel: string;
  destructiveAction?: React.ReactNode;
}

interface WorkspaceFormModalProps {
  title: string;
  subtitle: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSaving?: boolean;
  headerExtra?: React.ReactNode;
  leftPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
  maxWidth?: WorkspaceMaxWidth;
  footerActions: WorkspaceFooterActions;
}

export function WorkspaceFormModal({
  title,
  subtitle,
  onClose,
  onSubmit,
  isSaving = false,
  headerExtra,
  leftPanel,
  rightPanel,
  maxWidth = "4xl",
  footerActions,
}: WorkspaceFormModalProps) {
  const { cancelLabel = "Cancel", submitLabel, destructiveAction } = footerActions;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`modal-surface relative ${MAX_WIDTH_CLASS[maxWidth]} w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200`}
    >
      <form onSubmit={onSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border bg-card/95 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <AnimatedText
                as="h2"
                text={title}
                effect="fade-through"
                className="text-lg font-bold text-foreground leading-none font-display text-balance"
                replayKey={title}
              />
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-1.5 text-pretty">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {headerExtra}
            <button
              type="button"
              onClick={onClose}
              className="size-8 flex items-center justify-center rounded-full border border-card-border/40 bg-foreground/[0.02] text-muted hover:text-foreground hover:bg-foreground/[0.06] hover:border-card-border/80 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 ease-out group"
              aria-label="Close modal"
            >
              <X className="size-4 transition-transform duration-300 group-hover:rotate-90" />
            </button>
          </div>
        </div>

        {rightPanel ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            <div
              className="w-full md:w-[42%] border-r border-card-border bg-background/30 flex flex-col overflow-y-auto p-5 space-y-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both"
              style={{ animationDelay: "60ms" }}
            >
              {leftPanel}
            </div>
            <div
              className="w-full md:flex-1 flex flex-col overflow-y-auto p-5 space-y-5 bg-background/10 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both"
              style={{ animationDelay: "120ms" }}
            >
              {rightPanel}
            </div>
          </div>
        ) : (
          <div
            className="flex-1 overflow-y-auto p-5 space-y-5 bg-background/20 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both min-h-0"
            style={{ animationDelay: "60ms" }}
          >
            {leftPanel}
          </div>
        )}

        <div
          className={`flex items-center ${destructiveAction ? "justify-between" : "justify-end"} gap-2.5 px-6 py-4 border-t border-card-border bg-card shrink-0 z-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both`}
          style={{ animationDelay: "180ms" }}
        >
          {destructiveAction ?? null}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost min-h-9 px-4 rounded-xl text-[12px] font-bold active:scale-[0.98] transition-[transform,background-color,color] duration-150 ease-out cursor-pointer"
              disabled={isSaving}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              className="btn-primary min-h-9 px-5 rounded-xl text-[12px] font-bold shadow-md active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out cursor-pointer"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

interface TemplateDropdownProps {
  label?: string;
  selectedName: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  options: readonly { id: string; name: string }[];
  onSelect: (id: string) => void;
}

export function WorkspaceTemplateDropdown({
  label = "Template:",
  selectedName,
  isOpen,
  onToggle,
  onClose,
  options,
  onSelect,
}: TemplateDropdownProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-muted uppercase tracking-wider hidden sm:inline">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 text-[12px] font-semibold bg-foreground/[0.03] border border-card-border/80 hover:bg-foreground/[0.05] rounded-lg pl-3 pr-2.5 py-1 text-foreground outline-none hover:border-accent/50 focus:border-accent transition-[background-color,border-color] duration-200 ease-out"
        >
          {selectedName}
          <ChevronDown className="size-3.5 text-muted/80 translate-y-[0.5px]" />
        </button>
        {isOpen && (
          <>
            <button type="button" aria-label="Close dropdown" className="fixed inset-0 z-10" onClick={onClose} />
            <div className="absolute right-0 top-full mt-1 w-[160px] bg-card border border-card-border rounded-xl shadow-lg z-20 py-1">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelect(option.id);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-1.5 text-[12px] transition-colors text-foreground hover:bg-foreground/[0.04] font-medium"
                >
                  {option.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
