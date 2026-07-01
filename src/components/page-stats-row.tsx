"use client";

import { type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";
import type { AnimatedIconHandle } from "@/components/icons/types";

export type PageStatTone = "default" | "accent" | "positive" | "warning";

const toneStyles: Record<
  PageStatTone,
  { badge: string; icon: string; hint: string }
> = {
  default: {
    badge: "bg-foreground/[0.04] border-card-border/60",
    icon: "text-muted-foreground",
    hint: "text-muted",
  },
  accent: {
    badge: "bg-accent/10 border-accent/20",
    icon: "text-accent",
    hint: "text-accent",
  },
  positive: {
    badge: "bg-positive/10 border-positive/20",
    icon: "text-positive",
    hint: "text-positive",
  },
  warning: {
    badge: "bg-accent/10 border-accent/20",
    icon: "text-accent",
    hint: "text-accent",
  },
};

type AnimatedIconComponent = React.ComponentType<{
  ref?: React.Ref<AnimatedIconHandle | null>;
  size?: number;
  className?: string;
}>;

export type PageStatItem = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: PageStatTone;
  icon: AnimatedIconComponent;
  iconRef?: RefObject<AnimatedIconHandle | null>;
};

function PageStatTile({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
  iconRef,
}: PageStatItem) {
  const styles = toneStyles[tone];

  return (
    <div className="relative overflow-hidden rounded-xl border border-card-border bg-card p-4 shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_4%,transparent),0_6px_20px_color-mix(in_srgb,var(--foreground)_4%,transparent)] select-none">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</span>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]",
            styles.badge
          )}
        >
          <Icon ref={iconRef} size={18} className={styles.icon} />
        </div>
      </div>

      <div className="rounded-lg border border-card-border/55 bg-foreground/[0.015] px-3.5 py-3 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <span className="min-w-0 truncate text-xl font-bold tracking-tight text-foreground font-display currency-value sm:text-2xl">
            {value}
          </span>

          {hint ? (
            <div className="flex shrink-0 items-center gap-3">
              <div className="h-8 w-px bg-card-border/80" />
              <span className={cn("text-[11px] font-semibold leading-tight", styles.hint)}>{hint}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PageStatsRow({ stats, className }: { stats: PageStatItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5", className)}>
      {stats.map((stat) => (
        <PageStatTile key={stat.label} {...stat} />
      ))}
    </div>
  );
}
