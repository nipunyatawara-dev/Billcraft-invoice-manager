"use client";

/* eslint-disable @next/next/no-img-element */

import { AnimatedNumber } from "@/components/animated-number";
import { PhoneInput } from "@/components/phone-input";
import type { ProfileDraft } from "@/hooks/use-user-data";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { useMemo, useState } from "react";

type ProfileCreateOnboardingProps = {
  error: string | null;
  isFirstRun: boolean;
  maxProfiles: number;
  onCancel: () => void;
  onImageChange: (field: "profilePic" | "signature", event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  profileForm: ProfileDraft;
  profileMessage: string;
  profilePasswordConfirm: string;
  profileSaving: boolean;
  profilesLength: number;
  setProfileForm: Dispatch<SetStateAction<ProfileDraft>>;
  setProfilePasswordConfirm: Dispatch<SetStateAction<string>>;
};

type CreationStep = {
  id: "identity" | "business" | "security" | "brand" | "finish";
  title: string;
  description: string;
  icon: string;
  optional?: boolean;
};

const STEPS: CreationStep[] = [
  {
    id: "identity",
    title: "Start your profile",
    description: "Set the name and role shown across BillCraft.",
    icon: "person",
  },
  {
    id: "business",
    title: "Add business details",
    description: "Use this information on invoice headers and exports.",
    icon: "storefront",
    optional: true,
  },
  {
    id: "security",
    title: "Secure this workspace",
    description: "Every profile gets its own local password.",
    icon: "lock",
  },
  {
    id: "brand",
    title: "Add profile assets",
    description: "Upload an avatar and signature when you have them ready.",
    icon: "draw",
    optional: true,
  },
  {
    id: "finish",
    title: "Ready to create",
    description: "Review the setup and open your new billing workspace.",
    icon: "check_circle",
  },
];

function updateProfileField(
  setProfileForm: Dispatch<SetStateAction<ProfileDraft>>,
  field: keyof ProfileDraft,
  value: string,
) {
  setProfileForm((currentForm) => ({ ...currentForm, [field]: value }));
}

function StepPreview({ step, profileForm }: { step: CreationStep; profileForm: ProfileDraft }) {
  if (step.id === "identity") {
    return (
      <div className="grid h-full place-items-center">
        <div className="w-full max-w-[230px] rounded-2xl bg-card/94 p-4 text-foreground shadow-[0_16px_36px_color-mix(in_srgb,var(--foreground)_14%,transparent)]">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-card-border bg-foreground/[0.04] text-accent">
              {profileForm.profilePic ? (
                <img className="h-full w-full object-cover" alt="" src={profileForm.profilePic} />
              ) : (
                <span className="material-symbols-outlined text-[22px]">person</span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{profileForm.name || "Your name"}</span>
              <span className="block truncate text-[11px] font-medium text-muted">{profileForm.profession || "Profession"}</span>
            </span>
          </div>
          <span className="block h-2.5 w-full rounded-full bg-foreground/12" />
          <span className="mt-2 block h-2.5 w-3/4 rounded-full bg-foreground/8" />
        </div>
      </div>
    );
  }

  if (step.id === "business") {
    return (
      <div className="grid h-full place-items-center">
        <div className="w-full max-w-[235px] space-y-3 rounded-2xl bg-card/94 p-4 text-foreground shadow-[0_16px_36px_color-mix(in_srgb,var(--foreground)_14%,transparent)]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold">{profileForm.businessName || "Business name"}</span>
            <span className="material-symbols-outlined text-[18px] text-accent">storefront</span>
          </div>
          {[profileForm.email || "you@example.com", profileForm.phone || "+94 77 000 0000"].map((value, index) => (
            <div key={index} className="rounded-xl border border-card-border px-3 py-2 text-[11px] font-medium text-muted">
              {value}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step.id === "security") {
    return (
      <div className="grid h-full place-items-center">
        <div className="w-full max-w-[220px] rounded-2xl bg-card/94 p-4 text-center text-foreground shadow-[0_16px_36px_color-mix(in_srgb,var(--foreground)_14%,transparent)]">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent/12 text-accent">
            <span className="material-symbols-outlined text-[26px]">lock</span>
          </span>
          <span className="mx-auto mt-4 block h-2.5 w-28 rounded-full bg-foreground/14" />
          <span className="mx-auto mt-2 block h-2 w-20 rounded-full bg-foreground/8" />
        </div>
      </div>
    );
  }

  if (step.id === "brand") {
    return (
      <div className="grid h-full place-items-center">
        <div className="grid w-full max-w-[240px] grid-cols-2 gap-3 rounded-2xl bg-card/94 p-4 text-foreground shadow-[0_16px_36px_color-mix(in_srgb,var(--foreground)_14%,transparent)]">
          <span className="grid h-24 place-items-center overflow-hidden rounded-2xl border border-card-border bg-foreground/[0.04]">
            {profileForm.profilePic ? (
              <img className="h-full w-full object-cover" alt="" src={profileForm.profilePic} />
            ) : (
              <span className="material-symbols-outlined text-[24px] text-muted">image</span>
            )}
          </span>
          <span className="grid h-24 place-items-center overflow-hidden rounded-2xl border border-card-border bg-foreground/[0.04]">
            {profileForm.signature ? (
              <img className="h-full w-full object-contain" alt="" src={profileForm.signature} />
            ) : (
              <span className="material-symbols-outlined text-[24px] text-muted">draw</span>
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full place-items-center">
      <div className="w-full max-w-[220px] rounded-2xl bg-card/94 p-5 text-center text-foreground shadow-[0_16px_36px_color-mix(in_srgb,var(--foreground)_14%,transparent)]">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-action-text">
          <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }}>check</span>
        </span>
        <p className="mt-4 truncate text-[14px] font-semibold">{profileForm.name || "Your profile"}</p>
        <p className="mt-1 truncate text-[11px] font-medium text-muted">{profileForm.profession || "Ready for invoices"}</p>
      </div>
    </div>
  );
}

export function ProfileCreateOnboarding({
  error,
  isFirstRun,
  maxProfiles,
  onCancel,
  onImageChange,
  onSubmit,
  profileForm,
  profileMessage,
  profilePasswordConfirm,
  profileSaving,
  profilesLength,
  setProfileForm,
  setProfilePasswordConfirm,
}: ProfileCreateOnboardingProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [maxUnlockedStepIndex, setMaxUnlockedStepIndex] = useState(0);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const activeStep = STEPS[activeStepIndex];
  const isProfileStepValid = Boolean(profileForm.name.trim() && profileForm.profession.trim());
  const isSecurityStepValid = Boolean((profileForm.password || "").length >= 6 && profileForm.password === profilePasswordConfirm);
  const completedSet = useMemo(() => new Set(completedStepIds), [completedStepIds]);
  const isFinalStep = activeStepIndex === STEPS.length - 1;
  const progressDegrees = Math.max(12, Math.round(((activeStepIndex + 1) / STEPS.length) * 360));
  const isBusinessDirty = Boolean(profileForm.businessName?.trim() || profileForm.email?.trim() || profileForm.phone?.trim());
  const isBrandDirty = Boolean(profileForm.profilePic || profileForm.signature);
  const canContinue = activeStep.id === "identity"
    ? isProfileStepValid
    : activeStep.id === "security"
      ? isSecurityStepValid
      : true;

  function markStepComplete(stepId: string) {
    setCompletedStepIds((currentStepIds) => (
      currentStepIds.includes(stepId) ? currentStepIds : [...currentStepIds, stepId]
    ));
  }

  function goToStep(index: number) {
    if (index > maxUnlockedStepIndex) {
      return;
    }

    setActiveStepIndex(index);
  }

  function goNext() {
    if (!canContinue) {
      return;
    }

    markStepComplete(activeStep.id);
    setMaxUnlockedStepIndex((currentIndex) => Math.max(currentIndex, Math.min(activeStepIndex + 1, STEPS.length - 1)));
    setActiveStepIndex((currentIndex) => Math.min(currentIndex + 1, STEPS.length - 1));
  }

  function goBack() {
    setActiveStepIndex((currentIndex) => Math.max(currentIndex - 1, 0));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    markStepComplete(activeStep.id);
    onSubmit(event);
  }

  function renderStepFields() {
    if (activeStep.id === "identity") {
      return (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-medium text-foreground" htmlFor="profile-name">Full Name</label>
            <input
              id="profile-name"
              value={profileForm.name}
              onChange={(event) => updateProfileField(setProfileForm, "name", event.target.value)}
              placeholder="e.g. John Doe"
              className="field-control px-3 py-2.5"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-medium text-foreground" htmlFor="profile-profession">Profession / Role</label>
            <input
              id="profile-profession"
              value={profileForm.profession}
              onChange={(event) => updateProfileField(setProfileForm, "profession", event.target.value)}
              placeholder="e.g. Graphic Designer, Freelance Developer"
              className="field-control px-3 py-2.5"
            />
          </div>
        </div>
      );
    }

    if (activeStep.id === "business") {
      return (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-medium text-foreground" htmlFor="profile-business">Business Name</label>
            <input
              id="profile-business"
              value={profileForm.businessName}
              onChange={(event) => updateProfileField(setProfileForm, "businessName", event.target.value)}
              placeholder="e.g. Studio Design"
              className="field-control px-3 py-2.5"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-medium text-foreground" htmlFor="profile-email">Email Address</label>
              <input
                id="profile-email"
                type="email"
                value={profileForm.email}
                onChange={(event) => updateProfileField(setProfileForm, "email", event.target.value)}
                placeholder="you@example.com"
                className="field-control px-3 py-2.5"
              />
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-medium text-foreground" htmlFor="profile-phone">Phone Number</label>
              <PhoneInput
                id="profile-phone"
                value={profileForm.phone || ""}
                onChange={(phone) => updateProfileField(setProfileForm, "phone", phone)}
                hintPhone={profileForm.phone}
              />
            </div>
          </div>
        </div>
      );
    }

    if (activeStep.id === "security") {
      return (
        <div className="space-y-3">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-medium text-foreground" htmlFor="profile-password">Password</label>
            <input
              id="profile-password"
              minLength={6}
              type="password"
              value={profileForm.password || ""}
              onChange={(event) => updateProfileField(setProfileForm, "password", event.target.value)}
              placeholder="Minimum 6 characters"
              className="field-control px-3 py-2.5"
            />
            <p className="text-[11px] text-muted">Numbers-only passwords are allowed.</p>
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-medium text-foreground" htmlFor="profile-password-confirm">Confirm Password</label>
            <input
              id="profile-password-confirm"
              minLength={6}
              type="password"
              value={profilePasswordConfirm}
              onChange={(event) => setProfilePasswordConfirm(event.target.value)}
              placeholder="Repeat password"
              className="field-control px-3 py-2.5"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-[13px] font-medium text-foreground" htmlFor="profile-password-hint">Password Hint <span className="text-muted font-normal">(Optional)</span></label>
          <input
            id="profile-password-hint"
            value={profileForm.passwordHint || ""}
            onChange={(event) => updateProfileField(setProfileForm, "passwordHint", event.target.value)}
            placeholder="Helpful reminder"
            className="field-control px-3 py-2.5"
          />
        </div>
        </div>
      );
    }

    if (activeStep.id === "brand") {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-card-border p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Profile Picture</p>
            <div className="flex items-center gap-3">
              <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-card-border bg-foreground/[0.03]">
                {profileForm.profilePic ? (
                  <img className="h-full w-full object-cover" alt="Profile preview" src={profileForm.profilePic} />
                ) : (
                  <span className="material-symbols-outlined text-foreground/25">image</span>
                )}
              </div>
              <label className="flex items-center justify-center min-h-8 bg-card border border-card-border hover:border-foreground/20 hover:bg-foreground/[0.02] text-foreground px-3 py-1.5 rounded-xl font-medium transition-all shadow-sm cursor-pointer text-[12px]">
                <span>{profileForm.profilePic ? "Change" : "Upload"}</span>
                <input className="sr-only" type="file" accept="image/*" onChange={(event) => onImageChange("profilePic", event)} />
              </label>
            </div>
          </div>
          <div className="rounded-2xl border border-card-border p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Signature</p>
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-card-border bg-foreground/[0.03]">
                {profileForm.signature ? (
                  <img className="h-full w-full object-contain" alt="Signature preview" src={profileForm.signature} />
                ) : (
                  <span className="material-symbols-outlined text-foreground/25">draw</span>
                )}
              </div>
              <label className="flex items-center justify-center min-h-8 bg-card border border-card-border hover:border-foreground/20 hover:bg-foreground/[0.02] text-foreground px-3 py-1.5 rounded-xl font-medium transition-all shadow-sm cursor-pointer text-[12px]">
                <span>{profileForm.signature ? "Change" : "Upload"}</span>
                <input className="sr-only" type="file" accept="image/*" onChange={(event) => onImageChange("signature", event)} />
              </label>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          { label: "Name", value: profileForm.name || "Required" },
          { label: "Role", value: profileForm.profession || "Required" },
          { label: "Business", value: profileForm.businessName || "Optional" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-card-border p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{item.label}</p>
            <p className="mt-1 truncate text-[13px] font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("overflow-hidden", profilesLength >= maxProfiles && "pointer-events-none opacity-50")}>
      <div className="flex items-center gap-3 border-b border-card-border px-5 py-3 sm:px-6">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--accent) ${progressDegrees}deg, color-mix(in srgb, var(--foreground) 10%, transparent) 0deg)`,
          }}
        >
          <span className="grid size-[1.35rem] place-items-center rounded-full bg-background">
            <span className="size-2 rounded-full bg-accent" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-foreground">Get Started</span>
        </span>
        <span className="whitespace-nowrap text-[12px] font-medium text-muted">
          <AnimatedNumber value={activeStepIndex + 1} /> of <AnimatedNumber value={STEPS.length} />
        </span>
        {!isFirstRun && (
          <button type="button" onClick={onCancel} className="grid size-8 place-items-center rounded-full text-muted transition-smooth hover:bg-foreground/[0.04]">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="min-h-[210px] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_15%,#0d0e12)_0%,#15161c_100%)] p-6 sm:p-8 text-white border-b lg:border-b-0 lg:border-r border-card-border">
          <div className="mb-2 flex items-center gap-2 text-white/80 text-[11px] font-semibold">
            <button type="button" onClick={goBack} disabled={activeStepIndex === 0} className="grid size-7 place-items-center rounded-full transition-smooth hover:bg-white/10 disabled:opacity-35">
              <span className="material-symbols-outlined text-[15px]">arrow_back_ios_new</span>
            </button>
            <span><AnimatedNumber value={activeStepIndex + 1} /> of <AnimatedNumber value={STEPS.length} /></span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeStep.id}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 18, filter: "blur(5px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -14, filter: "blur(4px)" }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="h-[166px]"
            >
              <StepPreview step={activeStep} profileForm={profileForm} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${activeStep.id}-fields`}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(3px)" }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-8">
                <p className="section-eyebrow mb-1">Profile Setup</p>
                <h2 className="font-display text-2xl font-semibold leading-tight text-foreground">{activeStep.title}</h2>
                <p className="mt-1 text-[13px] font-medium leading-5 text-muted">{activeStep.description}</p>
              </div>

              {renderStepFields()}

              {(profileMessage || error) && (
                <p className="mt-4 rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-[12px] font-medium text-accent">
                  {profileMessage || error}
                </p>
              )}

              {!canContinue && (
                <p className="mt-4 text-[12px] font-medium italic text-muted">
                  {activeStep.id === "identity" ? "Name and profession are required." : "Use at least 6 matching password characters."}
                </p>
              )}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {activeStepIndex > 0 && (
                  <button type="button" onClick={goBack} className="btn-secondary active:scale-[0.97]">
                    Previous
                  </button>
                )}
                {activeStep.optional && !isFinalStep && (
                  <button
                    type="button"
                    onClick={goNext}
                    className="btn-secondary active:scale-[0.97]"
                    disabled={activeStep.id === "business" ? isBusinessDirty : activeStep.id === "brand" ? isBrandDirty : false}
                  >
                    Skip
                  </button>
                )}
                {isFinalStep ? (
                  <button type="submit" className="btn-primary active:scale-[0.97]" disabled={profileSaving || profilesLength >= maxProfiles}>
                    {profileSaving ? "Saving..." : "Create Profile"}
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goNext}
                    className="btn-primary active:scale-[0.97]"
                    disabled={
                      !canContinue ||
                      (activeStep.optional && (
                        activeStep.id === "business" ? !isBusinessDirty : activeStep.id === "brand" ? !isBrandDirty : false
                      ))
                    }
                  >
                    Continue
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="divide-y divide-card-border border-t border-card-border">
        {STEPS.map((step, index) => {
          const isComplete = completedSet.has(step.id) || (isFinalStep && index < activeStepIndex);
          const isActive = index === activeStepIndex;
          const isUnlocked = index <= maxUnlockedStepIndex;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(index)}
              disabled={!isUnlocked}
              className={cn(
                "flex w-full items-center gap-3 px-5 py-3 text-left transition-smooth sm:px-6",
                isActive && "bg-accent/[0.06]",
                isUnlocked ? "hover:bg-foreground/[0.025]" : "cursor-not-allowed opacity-45",
              )}
            >
              <span className={cn(
                "flex size-6 shrink-0 items-center justify-center text-muted",
                isComplete && "text-accent"
              )}>
                <span className="material-symbols-outlined block text-[15px] leading-none tracking-normal" style={isComplete ? { fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" } : undefined}>
                  {isComplete ? "check" : step.icon}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn(
                  "block truncate text-[13px] font-semibold",
                  isComplete ? "text-muted line-through decoration-muted/50" : "text-foreground",
                )}>
                  {step.title}
                </span>
              </span>
              {isUnlocked && !isComplete && (
                <span className="material-symbols-outlined text-[18px] text-muted">chevron_right</span>
              )}
            </button>
          );
        })}
      </div>

      {profilesLength >= maxProfiles && (
        <p className="px-5 py-4 text-[12px] text-muted sm:px-6">Profile limit reached. Switch between your existing profiles above.</p>
      )}
    </form>
  );
}
