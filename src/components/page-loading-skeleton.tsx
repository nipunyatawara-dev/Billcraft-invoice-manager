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

function StatSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div className={`${featured ? "surface-featured" : "surface-card"} p-4`}>
      <SkeletonBlock className="h-3 w-24 mb-4" />
      <SkeletonBlock className="h-7 w-28 mb-2" />
      <SkeletonBlock className="h-3 w-20" />
    </div>
  );
}

function HeadingSkeleton({ showAction = true }: { showAction?: boolean }) {
  return (
    <div className="page-heading">
      <div className="min-w-0">
        <SkeletonBlock className="h-3 w-20 mb-3" />
        <SkeletonBlock className="h-11 w-64 max-w-[70vw]" />
      </div>
      {showAction && <SkeletonBlock className="hidden md:block h-10 w-32 rounded-lg" />}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div className="md:col-span-2 md:row-span-2 surface-featured p-6 lg:p-8 min-h-[280px] flex flex-col justify-between">
          <div>
            <SkeletonBlock className="size-7 rounded-lg mb-3" />
            <SkeletonBlock className="h-4 w-36" />
          </div>
          <div>
            <SkeletonBlock className="h-14 w-48 mb-4" />
            <div className="flex gap-3">
              <SkeletonBlock className="h-6 w-20 rounded-md" />
              <SkeletonBlock className="h-4 w-28" />
            </div>
          </div>
        </div>
        <StatSkeleton />
        <StatSkeleton />
        <div className="md:col-span-2 surface-card p-5 lg:p-6 min-h-[133px]">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex-1">
              <SkeletonBlock className="h-3 w-28 mb-2" />
              <SkeletonBlock className="h-3 w-40" />
            </div>
            <SkeletonBlock className="size-9 rounded-lg" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-card-border p-3">
                <SkeletonBlock className="h-6 w-10 mb-2" />
                <SkeletonBlock className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 lg:col-span-4 surface-card p-6 min-h-[180px]">
          <div className="flex justify-between mb-8">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="h-3 w-16" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index}>
                <div className="flex items-center gap-3 mb-4">
                  <SkeletonBlock className="size-9 rounded-lg" />
                  <div className="flex-1">
                    <SkeletonBlock className="h-3 w-24 mb-2" />
                    <SkeletonBlock className="h-2.5 w-14" />
                  </div>
                </div>
                <SkeletonBlock className="h-5 w-20 mb-2" />
                <SkeletonBlock className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function RecordsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatSkeleton key={index} featured={index === 0} />
        ))}
      </div>
      <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center">
        <SkeletonBlock className="h-10 w-full max-w-md rounded-lg" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="surface-card p-4 sm:p-5 min-h-[320px]">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={`flex items-center gap-4 py-4 ${index > 0 ? "border-t border-card-border" : ""}`}>
            <SkeletonBlock className="size-11 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <SkeletonBlock className="h-4 w-40 mb-2" />
              <SkeletonBlock className="h-3 w-56 max-w-full" />
            </div>
            <SkeletonBlock className="hidden sm:block h-5 w-24" />
            <SkeletonBlock className="h-6 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </>
  );
}

function AnalyticsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 auto-rows-auto mb-3">
        <div className="md:col-span-2 surface-card p-6 lg:p-7 min-h-[320px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <SkeletonBlock className="h-5 w-32 mb-2" />
              <SkeletonBlock className="h-3 w-48" />
            </div>
            <SkeletonBlock className="size-9 rounded-lg" />
          </div>
          <div className="flex h-48 items-end gap-2 border-t border-card-border pt-6">
            {[35, 54, 42, 76, 58, 88, 64].map((height, index) => (
              <SkeletonBlock key={index} className="flex-1 rounded-t-lg" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="surface-featured p-6 lg:p-7 min-h-[320px] flex flex-col items-center justify-center">
          <SkeletonBlock className="size-32 rounded-full mb-5" />
          <SkeletonBlock className="h-4 w-36 mb-2" />
          <SkeletonBlock className="h-3 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-auto">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatSkeleton key={index} />
        ))}
      </div>
    </>
  );
}

function KanbanSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatSkeleton key={index} featured={index === 0} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
        {Array.from({ length: 4 }).map((_, columnIndex) => (
          <div key={columnIndex} className="surface-card p-3 min-h-[320px] md:min-h-[520px]">
            <div className="flex items-center justify-between gap-3 pb-3">
              <div className="flex items-center gap-2.5">
                <SkeletonBlock className="size-8 rounded-lg" />
                <div>
                  <SkeletonBlock className="h-4 w-24 mb-2" />
                  <SkeletonBlock className="h-2.5 w-12" />
                </div>
              </div>
              <SkeletonBlock className="size-7 rounded-lg" />
            </div>
            <div className="space-y-2.5">
              {Array.from({ length: columnIndex === 0 ? 2 : 1 }).map((_, cardIndex) => (
                <div key={cardIndex} className="rounded-lg border border-card-border bg-background/45 p-3">
                  <div className="flex gap-1.5 mb-3">
                    <SkeletonBlock className="h-5 w-16 rounded-md" />
                    <SkeletonBlock className="h-5 w-14 rounded-md" />
                  </div>
                  <SkeletonBlock className="h-4 w-44 max-w-full mb-3" />
                  <SkeletonBlock className="h-3 w-full mb-2" />
                  <SkeletonBlock className="h-3 w-4/5 mb-4" />
                  <div className="pt-3 border-t border-card-border flex gap-3">
                    <SkeletonBlock className="h-4 w-24" />
                    <SkeletonBlock className="h-4 w-16" />
                    <SkeletonBlock className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-3">
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="surface-card p-5 sm:p-7">
            <SkeletonBlock className="h-3 w-24 mb-3" />
            <SkeletonBlock className="h-7 w-56 mb-5" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SkeletonBlock className="h-10 rounded-lg" />
              <SkeletonBlock className="h-10 rounded-lg" />
              <SkeletonBlock className="h-10 rounded-lg sm:col-span-2" />
            </div>
          </div>
        ))}
      </div>
      <div className="surface-card p-5 sm:p-6 h-fit">
        <SkeletonBlock className="size-16 rounded-lg mb-4" />
        <SkeletonBlock className="h-5 w-36 mb-2" />
        <SkeletonBlock className="h-3 w-44 mb-5" />
        <SkeletonBlock className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function PageLoadingSkeleton({ variant = "dashboard" }: { variant?: SkeletonVariant }) {
  return (
    <main className="app-main flex-1" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <HeadingSkeleton showAction={variant !== "analytics"} />
      {variant === "dashboard" && <DashboardSkeleton />}
      {variant === "records" && <RecordsSkeleton />}
      {variant === "analytics" && <AnalyticsSkeleton />}
      {variant === "kanban" && <KanbanSkeleton />}
      {variant === "settings" && <SettingsSkeleton />}
    </main>
  );
}
