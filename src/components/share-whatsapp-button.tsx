"use client";

import { useState } from "react";
import { ShareChannelIcon, SHARE_CHANNEL_ICONS } from "@/components/brand-icons/share-channel-icons";
import {
  isMobileShareDevice,
  resolveWhatsAppPhone,
  type WhatsAppTarget,
} from "@/lib/whatsapp-phone";
import { cn } from "@/lib/utils";

type ShareWhatsAppButtonProps = {
  whatsapp?: string;
  phone?: string;
  profilePhone?: string;
  busy?: boolean;
  disabled?: boolean;
  onSelectTarget: (target: WhatsAppTarget) => void;
};

export function ShareWhatsAppButton({
  whatsapp,
  phone,
  profilePhone,
  busy = false,
  disabled = false,
  onSelectTarget,
}: ShareWhatsAppButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const normalizedPhone = resolveWhatsAppPhone({ whatsapp, phone, profilePhone });
  const hasContact = Boolean(normalizedPhone);
  const isMobile = isMobileShareDevice();

  if (!hasContact) {
    return (
      <button
        type="button"
        disabled
        className="btn-secondary text-[11px] py-2 text-center flex flex-col items-center justify-center gap-1.5 opacity-40 cursor-not-allowed border-card-border"
      >
        <ShareChannelIcon src={SHARE_CHANNEL_ICONS.whatsapp} alt="WhatsApp" />
        <span>WhatsApp</span>
      </button>
    );
  }

  function handlePrimaryClick() {
    if (isMobile) {
      onSelectTarget("mobile");
      return;
    }

    setPickerOpen((open) => !open);
  }

  function handleTargetSelect(target: WhatsAppTarget) {
    setPickerOpen(false);
    onSelectTarget(target);
  }

  return (
    <div className="relative">
      {pickerOpen && (
        <div className="absolute bottom-full left-0 right-0 z-20 mb-1.5 overflow-hidden rounded-lg border border-card-border bg-card shadow-lg">
          <button
            type="button"
            onClick={() => handleTargetSelect("web")}
            className="w-full px-3 py-2 text-left text-[11px] font-semibold text-foreground hover:bg-foreground/[0.04] transition-colors"
          >
            WhatsApp Web
          </button>
          <button
            type="button"
            onClick={() => handleTargetSelect("desktop")}
            className="w-full border-t border-card-border px-3 py-2 text-left text-[11px] font-semibold text-foreground hover:bg-foreground/[0.04] transition-colors"
          >
            WhatsApp Desktop
          </button>
        </div>
      )}

      <button
        type="button"
        disabled={disabled || busy}
        onClick={handlePrimaryClick}
        className={cn(
          "btn-secondary text-[11px] py-2 w-full text-center flex flex-col items-center justify-center gap-1.5 hover:bg-foreground/[0.02] transition-colors border-card-border disabled:opacity-40 disabled:cursor-not-allowed",
          pickerOpen && "ring-1 ring-accent/30",
        )}
      >
        <ShareChannelIcon src={SHARE_CHANNEL_ICONS.whatsapp} alt="WhatsApp" />
        <span>{busy ? "Preparing…" : "WhatsApp"}</span>
      </button>
    </div>
  );
}
