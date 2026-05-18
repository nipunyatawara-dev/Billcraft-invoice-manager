"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { useUserData } from "@/hooks/use-user-data";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ProfileOnboardingProps = {
  profileId: string | null;
  onClose: () => void;
};

type StoredOnboardingState = {
  completedStepIds?: string[];
  dismissed?: boolean;
};

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: string;
  actionLabel?: string;
  href?: string;
  completed: boolean;
};

const STORAGE_PREFIX = "billcraft.profile-onboarding.state.v1";

function getStorageKey(profileId: string) {
  return `${STORAGE_PREFIX}.${profileId}`;
}

function readStoredState(profileId: string): StoredOnboardingState {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedState = window.localStorage.getItem(getStorageKey(profileId));
    return storedState ? JSON.parse(storedState) as StoredOnboardingState : {};
  } catch {
    return {};
  }
}

function writeStoredState(profileId: string, state: StoredOnboardingState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(profileId), JSON.stringify(state));
}

function StepPreview({ step }: { step: OnboardingStep }) {
  if (step.id === "business") {
    return (
      <div className="grid h-full place-items-center">
        <div className="w-full max-w-[210px] space-y-3 rounded-2xl bg-[var(--card)]/92 p-4 shadow-[0_12px_30px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent)]/12 text-[var(--accent)]">
              <span className="material-symbols-outlined text-[18px]">storefront</span>
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <span className="block h-2.5 w-24 rounded-full bg-[var(--foreground)]/16" />
              <span className="block h-2 w-16 rounded-full bg-[var(--foreground)]/10" />
            </div>
          </div>
          <span className="block h-9 rounded-xl border border-[var(--card-border)] bg-[var(--field)]" />
        </div>
      </div>
    );
  }

  if (step.id === "client") {
    return (
      <div className="grid h-full place-items-center">
        <div className="w-full max-w-[220px] overflow-hidden rounded-2xl bg-[var(--card)]/92 shadow-[0_12px_30px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
          {["", "", ""].map((_, index) => (
            <div key={index} className="flex items-center gap-2.5 border-b border-[var(--card-border)] px-4 py-3 last:border-b-0">
              <span className="grid size-8 place-items-center rounded-xl bg-[var(--foreground)]/[0.05] text-[var(--muted)]">
                <span className="material-symbols-outlined text-[15px]">person</span>
              </span>
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="block h-2.5 w-24 rounded-full bg-[var(--foreground)]/16" />
                <span className="block h-2 w-14 rounded-full bg-[var(--foreground)]/10" />
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step.id === "invoice") {
    return (
      <div className="grid h-full place-items-center">
        <div className="w-full max-w-[210px] rounded-2xl bg-[var(--card)]/92 p-4 shadow-[0_12px_30px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
          <div className="mb-4 flex items-center justify-between">
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--accent)]/12 text-[var(--accent)]">
              <span className="material-symbols-outlined text-[17px]">receipt_long</span>
            </span>
            <span className="h-6 w-16 rounded-full bg-[var(--action)]" />
          </div>
          <div className="space-y-2.5">
            <span className="block h-2.5 w-28 rounded-full bg-[var(--foreground)]/16" />
            <span className="block h-2 w-full rounded-full bg-[var(--foreground)]/10" />
            <span className="block h-2 w-4/5 rounded-full bg-[var(--foreground)]/10" />
          </div>
        </div>
      </div>
    );
  }

  if (step.id === "analytics") {
    return (
      <div className="grid h-full place-items-center">
        <div className="flex h-[150px] w-[220px] items-end justify-center gap-2 rounded-2xl bg-[var(--card)]/92 p-4 shadow-[0_12px_30px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
          {[46, 78, 58, 104, 86].map((height, index) => (
            <span
              key={height}
              className={cn(
                "w-7 rounded-t-xl",
                index === 3 ? "bg-[var(--accent)]" : "bg-[var(--foreground)]/12",
              )}
              style={{ height }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full place-items-center">
      <span className="grid size-20 place-items-center rounded-full bg-[var(--card)]/92 text-[var(--accent)] shadow-[0_12px_30px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
        <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }}>check</span>
      </span>
    </div>
  );
}

export function ProfileOnboarding({ profileId, onClose }: ProfileOnboardingProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const { activeProfile, activeProfileId, clients, invoices, isProfileLocked } = useUserData();
  const initialStoredState = profileId ? readStoredState(profileId) : {};
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [manualCompletedStepIds, setManualCompletedStepIds] = useState<string[]>(() => initialStoredState.completedStepIds || []);
  const [isDismissed, setIsDismissed] = useState(() => Boolean(initialStoredState.dismissed));

  useEffect(() => {
    if (!profileId || isDismissed) return;

    const timer = window.setTimeout(() => {
      setIsExpanded(true);
    }, shouldReduceMotion ? 0 : 520);

    return () => window.clearTimeout(timer);
  }, [isDismissed, profileId, shouldReduceMotion]);

  const manualCompletedIds = useMemo(() => new Set(manualCompletedStepIds), [manualCompletedStepIds]);
  const steps = useMemo<OnboardingStep[]>(() => {
    if (!activeProfile) {
      return [];
    }

    const hasBusinessDetails = Boolean(activeProfile.businessName?.trim() && activeProfile.email?.trim());

    return [
      {
        id: "profile",
        title: "Create profile",
        description: "Your local workspace is ready.",
        icon: "check_circle",
        completed: true,
      },
      {
        id: "business",
        title: "Add business details",
        description: "Save business name and email for invoice headers.",
        icon: "storefront",
        href: "/settings",
        actionLabel: "Open Settings",
        completed: hasBusinessDetails || manualCompletedIds.has("business"),
      },
      {
        id: "client",
        title: "Add first client",
        description: "Create a regular client before billing work.",
        icon: "group_add",
        href: "/clients",
        actionLabel: "Add Client",
        completed: clients.length > 0 || manualCompletedIds.has("client"),
      },
      {
        id: "invoice",
        title: "Create first invoice",
        description: "Start with one invoice and track its balance.",
        icon: "receipt_long",
        href: "/invoices",
        actionLabel: "Create Invoice",
        completed: invoices.length > 0 || manualCompletedIds.has("invoice"),
      },
      {
        id: "analytics",
        title: "Review cashflow",
        description: "Open analytics once money starts moving.",
        icon: "bar_chart",
        href: "/analytics",
        actionLabel: "Open Analytics",
        completed: manualCompletedIds.has("analytics"),
      },
    ];
  }, [activeProfile, clients.length, invoices.length, manualCompletedIds]);

  const completedCount = steps.filter((step) => step.completed).length;
  const totalSteps = steps.length || 5;
  const progress = totalSteps > 0 ? completedCount / totalSteps : 0;
  const allDone = steps.length > 0 && completedCount === totalSteps;
  const firstPendingStep = steps.find((step) => !step.completed);
  const preferredStep = steps.find((step) => step.id === selectedStepId && !step.completed);
  const selectedStep = preferredStep || firstPendingStep || steps[steps.length - 1];
  const selectedStepIndex = steps.findIndex((step) => step.id === selectedStep?.id);

  function persist(nextCompletedStepIds: string[], dismissed = isDismissed) {
    if (!profileId) {
      return;
    }

    writeStoredState(profileId, {
      completedStepIds: nextCompletedStepIds,
      dismissed,
    });
  }

  function completeStep(stepId: string) {
    if (!profileId || manualCompletedIds.has(stepId)) {
      return;
    }

    const nextCompletedStepIds = [...manualCompletedStepIds, stepId];
    setManualCompletedStepIds(nextCompletedStepIds);
    persist(nextCompletedStepIds);
  }

  function skipCurrentStep() {
    if (!selectedStep) {
      return;
    }

    completeStep(selectedStep.id);
    const nextPendingStep = steps.find((step) => step.id !== selectedStep.id && !step.completed);

    if (nextPendingStep) {
      setSelectedStepId(nextPendingStep.id);
    }
  }

  function closeOnboarding() {
    if (!profileId) {
      return;
    }

    setIsDismissed(true);
    writeStoredState(profileId, {
      completedStepIds: manualCompletedStepIds,
      dismissed: true,
    });
    onClose();
  }

  if (!profileId || activeProfileId !== profileId || !activeProfile || isProfileLocked || isDismissed) {
    return null;
  }

  const progressDegrees = Math.max(12, Math.round(progress * 360));

  return (
    <AnimatePresence>
      <motion.aside
        className="fixed inset-x-3 bottom-3 z-[90] mx-auto w-[min(100%,24rem)] sm:inset-x-auto sm:right-5 sm:bottom-5"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(6px)" }}
        transition={{ duration: shouldReduceMotion ? 0.01 : 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div layout className="surface-card overflow-hidden bg-[var(--card)]">
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-smooth hover:bg-[var(--foreground)]/[0.025]"
            aria-expanded={isExpanded}
          >
            <span
              className="grid size-7 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--accent) ${progressDegrees}deg, color-mix(in srgb, var(--foreground) 10%, transparent) 0deg)`,
              }}
            >
              <span className="grid size-[1.15rem] place-items-center rounded-full bg-[var(--card)]">
                {allDone ? (
                  <span className="material-symbols-outlined text-[13px] text-[var(--accent)]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>check</span>
                ) : (
                  <span className="size-2 rounded-full bg-[var(--accent)]" />
                )}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-[var(--foreground)]">{allDone ? "All done!" : "Get Started"}</span>
            </span>
            <span className="whitespace-nowrap text-[12px] font-medium text-[var(--muted)]">
              <AnimatedNumber value={completedCount} /> of <AnimatedNumber value={totalSteps} /> Completed
            </span>
            <span className={cn("material-symbols-outlined text-[18px] text-[var(--muted)] transition-transform duration-200", isExpanded && "rotate-180")}>
              expand_more
            </span>
          </button>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="onboarding-body"
                initial={shouldReduceMotion ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0, height: 0 } : { opacity: 0, height: 0, y: -6 }}
                transition={{ duration: shouldReduceMotion ? 0.01 : 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden border-t border-[var(--card-border)]"
              >
                {allDone ? (
                  <div className="px-4 pb-4 pt-5 text-center">
                    <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-[var(--accent)] text-[var(--action-text)] shadow-[0_10px_24px_color-mix(in_srgb,var(--accent)_22%,transparent)]">
                      <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }}>check</span>
                    </span>
                    <h3 className="font-display text-lg font-semibold text-[var(--foreground)]">You&apos;re all set!</h3>
                    <p className="mx-auto mt-1 max-w-[15rem] text-[12px] font-medium leading-5 text-[var(--muted)]">Profile setup is complete. BillCraft is ready for daily billing.</p>
                    <button type="button" onClick={closeOnboarding} className="btn-primary mt-4 w-full active:scale-[0.97]">
                      Continue
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {selectedStep && (
                      <div className="border-b border-[var(--card-border)]">
                        <div className="h-[180px] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_82%,white)_0%,color-mix(in_srgb,var(--chart-soft)_72%,var(--background))_100%)] px-5 py-4 text-[var(--action-text)]">
                          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-[var(--action-text)]/80">
                            <span className="material-symbols-outlined text-[15px]">arrow_back_ios_new</span>
                            <span><AnimatedNumber value={selectedStepIndex + 1} /> of <AnimatedNumber value={totalSteps} /></span>
                          </div>
                          <StepPreview step={selectedStep} />
                        </div>
                        <div className="px-4 py-4">
                          <h3 className="font-display text-lg font-semibold leading-tight text-[var(--foreground)]">{selectedStep.title}</h3>
                          <p className="mt-1 text-[12px] font-medium leading-5 text-[var(--muted)]">{selectedStep.description}</p>
                          <div className="mt-4 flex gap-2">
                            <button type="button" onClick={skipCurrentStep} className="btn-secondary flex-1 active:scale-[0.97]">
                              Skip
                            </button>
                            {selectedStep.href && selectedStep.actionLabel ? (
                              <Link
                                href={selectedStep.href}
                                onClick={() => {
                                  if (selectedStep.id === "analytics" || pathname === selectedStep.href) {
                                    completeStep(selectedStep.id);
                                  }
                                }}
                                className="btn-primary flex-1 active:scale-[0.97]"
                              >
                                {selectedStep.actionLabel}
                              </Link>
                            ) : (
                              <button type="button" onClick={skipCurrentStep} className="btn-primary flex-1 active:scale-[0.97]">
                                Continue
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="divide-y divide-[var(--card-border)]">
                      {steps.map((step) => (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => {
                            if (!step.completed) {
                              setSelectedStepId(step.id);
                            }
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-3 text-left transition-smooth hover:bg-[var(--foreground)]/[0.025]",
                            selectedStep?.id === step.id && !step.completed && "bg-[var(--accent)]/[0.06]",
                          )}
                        >
                          <span className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-full border text-[var(--muted)]",
                            step.completed
                              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--action-text)]"
                              : "border-[var(--card-border)] bg-[var(--card)]",
                          )}>
                            <span className="material-symbols-outlined text-[15px]" style={step.completed ? { fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" } : undefined}>
                              {step.completed ? "check" : step.icon}
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn(
                              "block truncate text-[13px] font-semibold",
                              step.completed ? "text-[var(--muted)] line-through decoration-[var(--muted)]/50" : "text-[var(--foreground)]",
                            )}>
                              {step.title}
                            </span>
                          </span>
                          {!step.completed && (
                            <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">chevron_right</span>
                          )}
                        </button>
                      ))}
                    </div>

                    <p className="border-t border-[var(--card-border)] px-4 py-3 text-center text-[11px] font-medium text-[var(--muted)]">
                      {completedCount >= 3 ? "Halfway there and then some" : "Small setup now, cleaner invoices later"}
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.aside>
    </AnimatePresence>
  );
}
