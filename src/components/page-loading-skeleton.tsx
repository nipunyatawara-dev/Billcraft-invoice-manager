"use client";

import type { CSSProperties } from "react";

type SkeletonVariant = "dashboard" | "records" | "analytics" | "kanban" | "settings";

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

export function getLoadingSkeletonVariant(pathname: string): SkeletonVariant {
  if (pathname === "/analytics") {
    return "analytics";
  }

  if (pathname === "/todo") {
    return "kanban";
  }

  if (pathname === "/settings") {
    return "settings";
  }

  if (pathname === "/invoices" || pathname === "/clients" || pathname === "/outsourcing" || pathname === "/expenses" || pathname === "/catalog") {
    return "records";
  }

  return "dashboard";
}

function SkeletonBlock({ className = "", style }: SkeletonProps) {
  return <span className={`skeleton-block ${className}`} style={style} aria-hidden="true" />;
}

function StatSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-card-border p-5 select-none">
      <div className="flex items-center justify-between mb-3.5">
        <SkeletonBlock className="h-3.5 w-24" />
        <SkeletonBlock className="size-4 rounded-md" />
      </div>
      <div className="bg-foreground/[0.015] border border-card-border/50 rounded-lg p-4">
        <div className="flex items-baseline gap-2">
          <SkeletonBlock className="h-8 w-24" />
          <SkeletonBlock className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

function HeadingSkeleton({ showAction = true, isSettings = false }: { showAction?: boolean; isSettings?: boolean }) {
  if (isSettings) {
    return (
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-30 pt-3 sm:pt-4 lg:pt-5 pb-4 -mt-3 sm:-mt-4 lg:-mt-5 -mx-6 sm:-mx-8 lg:-mx-12 px-6 sm:px-8 lg:px-12 border-b border-card-border/40 mb-8 select-none">
        <div className="min-w-0">
          <SkeletonBlock className="h-3.5 w-16 mb-2.5" />
          <SkeletonBlock className="h-9 w-48 mb-2.5" />
          <SkeletonBlock className="h-4.5 w-96 max-w-full" />
        </div>
      </div>
    );
  }

  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 select-none">
      <div className="min-w-0">
        <SkeletonBlock className="h-3.5 w-16 mb-2.5" />
        <SkeletonBlock className="h-9 w-48 mb-2.5" />
        <SkeletonBlock className="h-4.5 w-80 max-w-full" />
      </div>
      {showAction && (
        <SkeletonBlock className="h-11 w-36 rounded-xl shrink-0" />
      )}
    </header>
  );
}

function DashboardSkeleton() {
  return (
    <>
      {/* 3 Bento Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>

      {/* Recent Invoices Card */}
      <div className="bg-card rounded-xl border border-card-border mb-4 select-none">
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-card-border">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-3.5 w-16" />
        </div>
        <div className="px-4 py-2 space-y-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="size-9 rounded-full" />
                <div>
                  <SkeletonBlock className="h-3.5 w-28 mb-1" />
                  <SkeletonBlock className="h-2.5 w-20" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <SkeletonBlock className="h-4 w-16" />
                <SkeletonBlock className="h-5 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart and Quick Actions Row */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch select-none">
        {/* Chart Card */}
        <div className="flex-1 bg-card rounded-xl border border-card-border p-5 min-h-[320px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <SkeletonBlock className="h-4 w-36 mb-2" />
              <SkeletonBlock className="h-3 w-56" />
            </div>
            <SkeletonBlock className="h-8 w-32 rounded-lg" />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <SkeletonBlock className="h-14 rounded-lg" />
            <SkeletonBlock className="h-14 rounded-lg" />
            <SkeletonBlock className="h-14 rounded-lg" />
          </div>
          {/* Chart representation */}
          <div className="flex h-40 items-end gap-2 border-t border-card-border/50 pt-4 mt-auto">
            {[45, 68, 52, 85, 60, 92, 74].map((height, index) => (
              <SkeletonBlock key={index} className="flex-1 rounded-t-lg" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="w-full lg:w-[340px] shrink-0 bg-card rounded-xl border border-card-border flex flex-col overflow-hidden min-h-[320px]">
          <div className="p-5 pb-3">
            <SkeletonBlock className="h-4 w-28 mb-1.5" />
            <SkeletonBlock className="h-3 w-48" />
          </div>
          <div className="flex flex-col gap-1 px-3 pb-3 flex-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex flex-1 items-center gap-3 rounded-xl px-3 py-3">
                <SkeletonBlock className="size-9 rounded-lg shrink-0" />
                <div className="flex-1">
                  <SkeletonBlock className="h-3.5 w-24 mb-1.5" />
                  <SkeletonBlock className="h-2.5 w-32" />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-card-border px-5 py-2.5">
            <SkeletonBlock className="h-3 w-40 mx-auto" />
          </div>
        </div>
      </div>
    </>
  );
}

function RecordsStatSkeleton() {
  return (
    <div className="rounded-xl border border-card-border bg-card p-4 select-none shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_4%,transparent),0_6px_20px_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="size-9 rounded-lg shrink-0" />
      </div>
      <div className="rounded-lg border border-card-border/55 bg-foreground/[0.015] px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <SkeletonBlock className="h-7 w-24" />
          <div className="flex items-center gap-3 shrink-0">
            <SkeletonBlock className="h-8 w-px" />
            <SkeletonBlock className="h-3 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <RecordsStatSkeleton />
        <RecordsStatSkeleton />
        <RecordsStatSkeleton />
        <RecordsStatSkeleton />
      </div>

      {/* Search and Filters Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center justify-between select-none">
        <SkeletonBlock className="h-10 w-full sm:w-[320px] rounded-xl" />
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-9 w-20 rounded-xl shrink-0" />
          ))}
        </div>
      </div>

      {/* Main Content List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 select-none">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-card border border-card-border rounded-xl p-5 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="size-10 rounded-xl shrink-0" />
                <div>
                  <SkeletonBlock className="h-4 w-32 mb-1.5" />
                  <SkeletonBlock className="h-2.5 w-20" />
                </div>
              </div>
              <SkeletonBlock className="h-5.5 w-16 rounded-lg" />
            </div>
            <div className="border-t border-card-border/55 border-dashed pt-3.5 mt-3 flex items-center justify-between">
              <SkeletonBlock className="h-4 w-24" />
              <div className="flex gap-2">
                <SkeletonBlock className="size-7 rounded-lg" />
                <SkeletonBlock className="size-7 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AnalyticsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <RecordsStatSkeleton />
        <RecordsStatSkeleton />
        <RecordsStatSkeleton />
        <RecordsStatSkeleton />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 select-none">
        {/* Main Chart Card (2/3 Width) */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-card-border p-6 min-h-[360px] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <div>
              <SkeletonBlock className="h-4.5 w-32 mb-2" />
              <SkeletonBlock className="h-3 w-48" />
            </div>
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
          </div>
          <div className="flex h-48 items-end gap-2 border-t border-card-border/50 pt-6">
            {[35, 54, 42, 76, 58, 88, 64].map((height, index) => (
              <SkeletonBlock key={index} className="flex-1 rounded-t-lg" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>

        {/* Paid Ratio Circle Card (1/3 Width) */}
        <div className="bg-card rounded-xl border border-card-border p-6 min-h-[360px] flex flex-col items-center justify-center">
          <div className="text-center w-full mb-6">
            <SkeletonBlock className="h-4.5 w-28 mx-auto mb-1.5" />
            <SkeletonBlock className="h-3 w-36 mx-auto" />
          </div>
          <div className="relative size-40 flex items-center justify-center mb-4">
            {/* Outer track ring */}
            <div className="absolute inset-0 rounded-full border-[10px] border-card-border/40" />
            <SkeletonBlock className="size-28 rounded-full" />
          </div>
          <SkeletonBlock className="h-3.5 w-24 mb-1.5" />
          <SkeletonBlock className="h-3 w-16" />
        </div>
      </div>
    </>
  );
}

function CompactStatSkeleton() {
  return (
    <div className="flex items-center gap-2.5 bg-card rounded-lg border border-card-border px-3 py-2 select-none">
      <SkeletonBlock className="size-4 rounded-md shrink-0" />
      <SkeletonBlock className="h-3 w-16 flex-1" />
      <SkeletonBlock className="h-4 w-6 shrink-0" />
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <>
      {/* Compact stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
        <CompactStatSkeleton />
        <CompactStatSkeleton />
        <CompactStatSkeleton />
        <CompactStatSkeleton />
      </div>

      {/* Board Scroll Wrapper */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar min-w-full items-start select-none">
          {Array.from({ length: 4 }).map((_, columnIndex) => (
            <section key={columnIndex} className="w-[300px] sm:w-[340px] shrink-0 bg-card/60 border border-card-border rounded-xl p-3.5 flex flex-col min-h-[460px]">
              {/* Column Header */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-card-border/60 mb-3.5">
                <div className="flex items-center gap-2">
                  <SkeletonBlock className="size-6 rounded-lg" />
                  <SkeletonBlock className="h-4 w-20" />
                  <SkeletonBlock className="size-4.5 rounded-full" />
                </div>
                <SkeletonBlock className="size-6 rounded-md" />
              </div>
              {/* Cards List */}
              <div className="space-y-3 flex-1">
                {Array.from({ length: columnIndex === 0 ? 2 : 1 }).map((_, cardIndex) => (
                  <div key={cardIndex} className="rounded-xl border border-card-border bg-card p-3.5 shadow-sm">
                    {/* Header tags */}
                    <div className="flex gap-1.5 mb-3">
                      <SkeletonBlock className="h-5 w-14 rounded-md" />
                      <SkeletonBlock className="h-5 w-12 rounded-md" />
                    </div>
                    {/* Title and descriptions */}
                    <SkeletonBlock className="h-4 w-44 max-w-full mb-3" />
                    <SkeletonBlock className="h-3 w-full mb-1.5" />
                    <SkeletonBlock className="h-3 w-4/5 mb-4" />
                    {/* Footer indicators */}
                    <div className="pt-3 border-t border-card-border border-dashed flex gap-3 items-center justify-between">
                      <SkeletonBlock className="h-3.5 w-16" />
                      <div className="flex gap-1.5">
                        <SkeletonBlock className="size-5 rounded-md" />
                        <SkeletonBlock className="size-5 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 select-none">
      {/* Navigation Sidebar Skeleton */}
      <div className="lg:w-72 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-card-border/40 bg-card min-w-[200px] lg:min-w-0">
            <SkeletonBlock className="size-10 rounded-xl shrink-0" />
            <div className="flex-1">
              <SkeletonBlock className="h-3.5 w-16 mb-1.5" />
              <SkeletonBlock className="hidden lg:block h-2.5 w-32" />
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Content Area Skeleton */}
      <div className="flex-1 min-w-0 space-y-6">
        <div className="bg-card border border-card-border rounded-xl p-6 lg:p-8">
          <SkeletonBlock className="h-4.5 w-32 mb-2" />
          <SkeletonBlock className="h-3 w-56 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-10 rounded-xl w-full" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-10 rounded-xl w-full" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <SkeletonBlock className="h-3.5 w-20" />
              <SkeletonBlock className="h-24 rounded-xl w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageLoadingSkeleton({ variant = "dashboard" }: { variant?: SkeletonVariant }) {
  return (
    <main className="app-main flex-1" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <HeadingSkeleton showAction={!["analytics", "dashboard"].includes(variant)} isSettings={variant === "settings"} />
      {variant === "dashboard" && <DashboardSkeleton />}
      {variant === "records" && <RecordsSkeleton />}
      {variant === "analytics" && <AnalyticsSkeleton />}
      {variant === "kanban" && <KanbanSkeleton />}
      {variant === "settings" && <SettingsSkeleton />}
    </main>
  );
}
