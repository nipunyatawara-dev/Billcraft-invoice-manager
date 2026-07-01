"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Briefcase,
  CheckCircle2,
  Clock,
  Database,
} from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import type { BillingNotificationItem } from "@/hooks/use-billing-alerts";
import { cn } from "@/lib/utils";

type NotificationsPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: BillingNotificationItem[];
  error: string | null;
  hasProfile: boolean;
  trigger: React.ReactNode;
};

function itemIcon(id: string) {
  if (id.startsWith("task-")) return Clock;
  if (id === "backup-due") return Database;
  if (id.startsWith("payable-")) return Briefcase;
  return AlertTriangle;
}

export function NotificationsPanel({
  open,
  onOpenChange,
  items,
  error,
  hasProfile,
  trigger,
}: NotificationsPanelProps) {
  const showSetup = !hasProfile;
  const showError = Boolean(error);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{trigger}</PopoverAnchor>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-card-border bg-card p-0 shadow-xl"
      >
        <div className="border-b border-card-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-accent" />
            <h2 className="text-sm font-bold text-foreground">Notifications</h2>
            {items.length > 0 && (
              <span className="ml-auto rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                {items.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Billing alerts and follow-ups for your workspace
          </p>
        </div>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto custom-scrollbar p-2">
          {showError && (
            <div className="rounded-lg border border-negative/20 bg-negative/5 px-3 py-3 text-[12px] text-foreground">
              <p className="font-semibold text-negative">Data sync issue</p>
              <p className="mt-1 text-muted">{error}</p>
            </div>
          )}

          {showSetup && !showError && (
            <div className="rounded-lg border border-card-border bg-foreground/[0.02] px-3 py-3 text-[12px]">
              <p className="font-semibold text-foreground">Profile setup needed</p>
              <p className="mt-1 text-muted">
                Create a profile to start saving invoices and clients.
              </p>
            </div>
          )}

          {!showError && !showSetup && items.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-positive/10 text-positive">
                <CheckCircle2 className="size-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">All caught up</p>
              <p className="mt-1 max-w-[16rem] text-[11px] text-muted">
                No overdue invoices, due tasks, backup reminders, or unpaid vendor bills right now.
              </p>
            </div>
          )}

          {!showError && !showSetup && items.length > 0 && (
            <ul className="space-y-1">
              {items.map((item) => {
                const Icon = itemIcon(item.id);

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-foreground/[0.04]"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-card-border",
                          item.tone === "warning" ? "bg-negative/10 text-negative" : "bg-accent/10 text-accent",
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-foreground group-hover:text-accent">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted">{item.description}</span>
                      </span>
                      <ArrowRight className="mt-1 size-3.5 shrink-0 text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
