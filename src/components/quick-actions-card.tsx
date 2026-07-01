"use client";

import Link from "next/link";
import { useRef, type MutableRefObject } from "react";
import { motion } from "motion/react";
import { ChevronRight, Command, Zap } from "lucide-react";
import FileDescriptionIcon from "@/components/icons/file-description-icon";
import WalletIcon from "@/components/icons/wallet-icon";
import UsersIcon from "@/components/icons/users-icon";
import ChartLineIcon from "@/components/icons/chart-line-icon";
import type { AnimatedIconHandle } from "@/components/icons/types";
import { usePageEnterMotion, useStaggerEnterMotion } from "@/hooks/use-page-enter-motion";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  {
    href: "/invoices?action=new",
    Icon: FileDescriptionIcon,
    label: "New Invoice",
    description: "Bill a client and get paid",
    color: "text-category-1",
    bg: "bg-category-1/10",
    hoverBorder: "hover:border-category-1/25",
    hoverBg: "hover:bg-category-1/[0.04]",
  },
  {
    href: "/expenses?action=new",
    Icon: WalletIcon,
    label: "Add Expense",
    description: "Log a business cost",
    color: "text-category-2",
    bg: "bg-category-2/10",
    hoverBorder: "hover:border-category-2/25",
    hoverBg: "hover:bg-category-2/[0.04]",
  },
  {
    href: "/clients?action=new",
    Icon: UsersIcon,
    label: "Add Client",
    description: "Create a new contact",
    color: "text-category-3",
    bg: "bg-category-3/10",
    hoverBorder: "hover:border-category-3/25",
    hoverBg: "hover:bg-category-3/[0.04]",
  },
  {
    href: "/analytics",
    Icon: ChartLineIcon,
    label: "View Reports",
    description: "Revenue & cashflow",
    color: "text-category-4",
    bg: "bg-category-4/10",
    hoverBorder: "hover:border-category-4/25",
    hoverBg: "hover:bg-category-4/[0.04]",
  },
] as const;

function QuickActionItem({
  action,
  index,
  iconRefs,
}: {
  action: (typeof QUICK_ACTIONS)[number];
  index: number;
  iconRefs: MutableRefObject<(AnimatedIconHandle | null)[]>;
}) {
  const itemMotion = useStaggerEnterMotion(index);

  return (
    <motion.div {...itemMotion}>
      <Link
        href={action.href}
        onMouseEnter={() => iconRefs.current[index]?.startAnimation()}
        onMouseLeave={() => iconRefs.current[index]?.stopAnimation()}
        className={cn(
          "group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all",
          action.hoverBg,
          action.hoverBorder,
          "hover:border-card-border hover:shadow-xs active:scale-[0.99]"
        )}
      >
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border border-card-border/40 transition-transform group-hover:scale-105",
            action.bg,
            action.color
          )}
        >
          <action.Icon
            ref={(el) => {
              iconRefs.current[index] = el;
            }}
            size={18}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground leading-tight">
            {action.label}
          </div>
          <div className="text-[11px] text-muted font-medium mt-0.5 truncate">
            {action.description}
          </div>
        </div>

        <ChevronRight className="size-4 shrink-0 text-muted/50 transition-all group-hover:text-accent group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}

export function QuickActionsCard() {
  const iconRefs = useRef<(AnimatedIconHandle | null)[]>([]);
  const cardMotion = usePageEnterMotion("actions");

  return (
    <motion.div
      {...cardMotion}
      className="bg-card text-card-foreground rounded-xl border border-card-border w-full lg:w-[360px] shrink-0 flex flex-col overflow-hidden"
    >
      <div className="p-6 pb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Zap className="size-[18px] text-accent" />
          Quick Actions
        </h2>
        <p className="text-xs text-muted mt-0.5 text-pretty">
          Jump straight into your most common workflows.
        </p>
      </div>

      <div className="flex flex-col gap-1.5 px-4 pb-4 flex-1">
        {QUICK_ACTIONS.map((action, index) => (
          <QuickActionItem
            key={action.href}
            action={action}
            index={index}
            iconRefs={iconRefs}
          />
        ))}
      </div>

      <div className="mt-auto border-t border-card-border bg-foreground/[0.015] px-6 py-3">
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted">
          <span>Press</span>
          <kbd className="inline-flex items-center gap-0.5 rounded-md border border-card-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-foreground shadow-xs">
            <Command className="size-2.5" />K
          </kbd>
          <span>for more shortcuts</span>
        </p>
      </div>
    </motion.div>
  );
}
