import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { AnimatedText } from "@/components/animated-text";
import { AnimatedNumber } from "@/components/animated-number";
import { ProfileCreateOnboarding } from "@/components/profile-create-onboarding";
import { useUserData, type ProfileDraft } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

const EMPTY_PROFILE_FORM: ProfileDraft = {
  name: "",
  profession: "",
  email: "",
  phone: "",
  businessName: "",
  profilePic: "",
  signature: "",
  password: "",
  passwordHint: "",
};

interface ProfileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileCreated: (profileId: string) => void;
  forceCreateProfile?: boolean;
}

export function ProfileManagerModal({ isOpen, onClose, onProfileCreated, forceCreateProfile }: ProfileManagerModalProps) {
  const {
    activeProfileId,
    createProfile,
    error,
    isProfileLocked,
    logoutProfile,
    profiles,
    switchProfile,
    unlockProfile,
    loading,
  } = useUserData();

  const isFirstRun = !loading && profiles.length === 0;
  const isLoggedOut = !loading && profiles.length > 0 && !activeProfileId;
  
  const [showCreateProfileForm, setShowCreateProfileForm] = useState(forceCreateProfile || false);
  const [profileForm, setProfileForm] = useState<ProfileDraft>(EMPTY_PROFILE_FORM);
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState("");
  const [profileAccessPassword, setProfileAccessPassword] = useState("");
  const [pendingSwitchProfileId, setPendingSwitchProfileId] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Sync forceCreateProfile prop
  useEffect(() => {
    if (forceCreateProfile) {
      setShowCreateProfileForm(true);
    }
  }, [forceCreateProfile]);

  // Reset state when opened or when locked state changes
  useEffect(() => {
    if (isOpen) {
      if (isProfileLocked && activeProfileId && !forceCreateProfile) {
        setShowCreateProfileForm(false);
        setPendingSwitchProfileId(null);
        setProfileAccessPassword("");
        setProfileMessage("");
      } else if (isFirstRun) {
        setShowCreateProfileForm(true);
      }
    }
  }, [isOpen, isProfileLocked, activeProfileId, isFirstRun, forceCreateProfile]);

  // Auto-focus password input when prompt appears
  useEffect(() => {
    if (pendingSwitchProfileId || isProfileLocked) {
      const timer = setTimeout(() => passwordInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [pendingSwitchProfileId, isProfileLocked]);

  function handleClose() {
    if (isFirstRun || profileSaving || isProfileLocked || isLoggedOut) {
      return;
    }
    
    setShowCreateProfileForm(false);
    setProfileForm(EMPTY_PROFILE_FORM);
    setProfilePasswordConfirm("");
    setProfileAccessPassword("");
    setPendingSwitchProfileId(null);
    setProfileMessage("");
    onClose();
  }

  function handleProfileImageChange(field: "profilePic" | "signature", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileForm((currentForm) => ({ ...currentForm, [field]: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleCreateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (profileSaving) return;

    if (!profileForm.name.trim() || !profileForm.profession.trim()) {
      notify.warning({
        title: "Profile details required",
        description: "Add your name and profession to create a profile.",
      });
      return;
    }

    if ((profileForm.password || "").length < 6) {
      notify.warning({
        title: "Password required",
        description: "Use at least 6 characters. Numbers-only passwords are allowed.",
      });
      return;
    }

    if (profileForm.password !== profilePasswordConfirm) {
      notify.warning({
        title: "Passwords do not match",
        description: "Confirm the same password before creating this profile.",
      });
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    try {
      const createdProfile = await notifyPromise(createProfile(profileForm), {
        loading: {
          title: "Creating profile...",
          description: "Preparing your local invoice workspace.",
        },
        success: {
          title: "Profile created",
          description: `${profileForm.name.trim()} is ready for invoices.`,
        },
        error: (err) => ({
          title: "Profile creation failed",
          description: getToastErrorMessage(err, "Unable to create this profile."),
        }),
      });
      
      setProfileForm(EMPTY_PROFILE_FORM);
      setProfilePasswordConfirm("");
      setShowCreateProfileForm(false);
      handleClose();
      
      if (createdProfile?.id) {
        onProfileCreated(createdProfile.id);
      }
    } catch (createError) {
      setProfileMessage(createError instanceof Error ? createError.message : "Unable to create profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleProfileSwitch(profileId: string) {
    if (profileId === activeProfileId) {
      if (isProfileLocked) {
        setPendingSwitchProfileId(null);
        setProfileAccessPassword("");
      } else {
        handleClose();
      }
      return;
    }

    const nextProfile = profiles.find((profile) => profile.id === profileId);

    if (nextProfile?.hasPassword) {
      setPendingSwitchProfileId(profileId);
      setProfileAccessPassword("");
      setProfileMessage("");
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    try {
      await notifyPromise(switchProfile(profileId), {
        loading: {
          title: "Switching profile...",
          description: "Loading this profile's local billing data.",
        },
        success: {
          title: "Profile switched",
          description: nextProfile ? `Now working as ${nextProfile.name}.` : "Your selected profile is active.",
        },
        error: (err) => ({
          title: "Profile switch failed",
          description: getToastErrorMessage(err, "Unable to switch profiles."),
        }),
      });
      handleClose();
    } catch (switchError) {
      setProfileMessage(switchError instanceof Error ? switchError.message : "Unable to switch profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleProfileAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const targetProfileId = pendingSwitchProfileId || activeProfileId;
    const targetProfile = profiles.find((profile) => profile.id === targetProfileId);

    if (!targetProfile || profileSaving) return;

    if (!profileAccessPassword) {
      notify.warning({
        title: "Password required",
        description: targetProfile.passwordHint ? `Hint: ${targetProfile.passwordHint}` : "Enter the profile password.",
      });
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    try {
      const isUnlocking = targetProfile.id === activeProfileId && isProfileLocked;
      const action = isUnlocking
        ? unlockProfile(targetProfile.id, profileAccessPassword)
        : switchProfile(targetProfile.id, profileAccessPassword);

      await notifyPromise(action, {
        loading: {
          title: isUnlocking ? "Unlocking profile..." : "Switching profile...",
          description: isUnlocking ? "Checking this profile password." : "Checking target profile password.",
        },
        success: {
          title: isUnlocking ? "Profile unlocked" : "Profile switched",
          description: isUnlocking ? `Welcome back, ${targetProfile.name}.` : `Now working as ${targetProfile.name}.`,
        },
        error: (err) => ({
          title: isUnlocking ? "Login failed" : "Profile switch failed",
          description: getToastErrorMessage(err, "Incorrect password."),
        }),
      });
      
      setProfileAccessPassword("");
      setPendingSwitchProfileId(null);
      setProfileMessage("");
      // Bypass handleClose's isProfileLocked guard — auth just succeeded
      setShowCreateProfileForm(false);
      setProfileForm(EMPTY_PROFILE_FORM);
      setProfilePasswordConfirm("");
      onClose();
    } catch (accessError) {
      setProfileMessage(accessError instanceof Error ? accessError.message : "Unable to unlock profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  function handleLogout() {
    logoutProfile();
    setShowCreateProfileForm(false);
    setPendingSwitchProfileId(null);
    setProfileAccessPassword("");
    setProfileMessage("");
    notify.info({
      title: "Logged out",
      description: "Select a profile to continue.",
    });
  }

  function handleBackFromPassword() {
    setPendingSwitchProfileId(null);
    setProfileAccessPassword("");
    setProfileMessage("");
  }

  if (!isOpen && !isFirstRun && !isProfileLocked && !isLoggedOut) {
    return null;
  }

  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const passwordPromptProfile = profiles.find((profile) => profile.id === (pendingSwitchProfileId || (isProfileLocked ? activeProfileId : null)));
  const isPasswordPromptForLogin = Boolean(passwordPromptProfile && passwordPromptProfile.id === activeProfileId && isProfileLocked);
  const canLogoutActiveProfile = Boolean(activeProfile && !isProfileLocked && !isLoggedOut);
  const isCreatingProfile = isFirstRun || showCreateProfileForm;
  const isLoggingIn = isProfileLocked || isLoggedOut || pendingSwitchProfileId !== null;
  const showPremiumBg = isCreatingProfile || isLoggingIn;
  const canDismiss = !isFirstRun && !isProfileLocked && !isLoggedOut;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Premium ambient background */}
      {showPremiumBg && (
        <div className="absolute inset-0 onboarding-bg overflow-hidden pointer-events-none animate-fade-in duration-500">
          <div className="onboarding-bg-glows absolute inset-0" />
          <div className="onboarding-bg-grid absolute inset-0" />
          <div className="onboarding-bg-lines absolute inset-0 opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
                  <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <circle cx="15%" cy="25%" r="200" fill="none" stroke="var(--card-border)" strokeWidth="1" strokeDasharray="6 6" />
              <circle cx="85%" cy="75%" r="350" fill="none" stroke="var(--card-border)" strokeWidth="1.5" />
              <circle cx="85%" cy="75%" r="150" fill="none" stroke="var(--card-border)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="25%" x2="100%" y2="25%" stroke="url(#line-grad)" strokeWidth="1" />
              <line x1="85%" y1="0" x2="85%" y2="100%" stroke="url(#line-grad)" strokeWidth="1" />
            </svg>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <button
        aria-label="Close profile manager"
        className={cn(
          "absolute inset-0 transition-all duration-300",
          showPremiumBg 
            ? "bg-black/40 backdrop-blur-md" 
            : "bg-black/70 backdrop-blur-md"
        )}
        onClick={handleClose}
      />

      <div className="relative flex justify-center items-center">
        {/* Creating profile flow — unchanged */}
        {isCreatingProfile && (
          <div
            role="dialog"
            aria-modal="true"
            className="modal-surface relative z-10 max-h-[92vh] w-full overflow-y-auto shadow-2xl shadow-accent/10 border border-white/5 backdrop-blur-xl max-w-4xl p-0"
          >
            <ProfileCreateOnboarding
              error={error}
              isFirstRun={isFirstRun}
              maxProfiles={5}
              onCancel={() => {
                setShowCreateProfileForm(false);
                setProfileForm(EMPTY_PROFILE_FORM);
                setProfilePasswordConfirm("");
                setProfileMessage("");
              }}
              onImageChange={handleProfileImageChange}
              onSubmit={handleCreateProfile}
              profileForm={profileForm}
              profileMessage={profileMessage}
              profilePasswordConfirm={profilePasswordConfirm}
              profileSaving={profileSaving}
              profilesLength={profiles.length}
              setProfileForm={setProfileForm}
              setProfilePasswordConfirm={setProfilePasswordConfirm}
            />
          </div>
        )}

        {/* Netflix-style profile selection */}
        {!isCreatingProfile && (
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 flex flex-col items-center w-full max-w-3xl"
          >
            {/* Close button */}
            {canDismiss && (
              <button 
                onClick={handleClose} 
                className="absolute -top-2 -right-2 sm:top-0 sm:right-0 z-20 grid size-10 place-items-center rounded-full bg-card/80 backdrop-blur-sm border border-card-border text-muted hover:text-foreground hover:bg-card transition-all duration-200 hover:scale-110"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}

            {/* Title section */}
            <motion.div 
              className="text-center mb-10 sm:mb-14"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="netflix-title-float">
                <AnimatedText 
                  as="h1" 
                  text={isProfileLocked ? "Welcome back" : "Who\u2019s billing?"} 
                  effect="micro-scale-fade" 
                  className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 tracking-tight" 
                  replayKey={isProfileLocked ? "locked" : "select"} 
                />
              </div>
              <p className="text-[15px] sm:text-[17px] text-muted font-medium">
                <AnimatedNumber value={profiles.length} /> / <AnimatedNumber value={5} />{" "}profiles &middot; stored locally
              </p>
            </motion.div>

            {/* Profile cards row */}
            <motion.div 
              className="flex flex-wrap justify-center gap-6 sm:gap-8 md:gap-10 mb-10 sm:mb-14"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              {profiles.map((profile, index) => {
                const isSelected = passwordPromptProfile?.id === profile.id;

                return (
                  <motion.button
                    key={profile.id}
                    type="button"
                    onClick={() => void handleProfileSwitch(profile.id)}
                    className={cn("netflix-profile-card", isSelected && "netflix-profile-card--selected")}
                    data-selected={false}
                    initial={{ opacity: 0, y: 24, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: 0.15 + index * 0.08, 
                      ease: [0.22, 1, 0.36, 1] 
                    }}
                  >
                    <div className="netflix-avatar-ring">
                      {profile.profilePic ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          className="h-full w-full object-cover" 
                          alt={profile.name} 
                          src={profile.profilePic} 
                        />
                      ) : (
                        <span className="material-symbols-outlined text-[48px] text-muted/60">person</span>
                      )}
                    </div>
                    <span className="netflix-profile-name">{profile.name}</span>
                  </motion.button>
                );
              })}

              {/* Add Profile card */}
              {profiles.length < 5 && (
                <motion.button
                  type="button"
                  onClick={() => setShowCreateProfileForm(true)}
                  className="netflix-profile-card netflix-add-card"
                  initial={{ opacity: 0, y: 24, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: 0.15 + profiles.length * 0.08, 
                    ease: [0.22, 1, 0.36, 1] 
                  }}
                >
                  <div className="netflix-avatar-ring">
                    <span className="material-symbols-outlined text-[48px] text-muted/40">add</span>
                  </div>
                  <span className="netflix-profile-name">Add Profile</span>
                </motion.button>
              )}
            </motion.div>

            {/* Password prompt — slides in below cards */}
            <AnimatePresence mode="wait">
              {passwordPromptProfile && (
                <motion.div
                  key={`password-${passwordPromptProfile.id}`}
                  initial={{ opacity: 0, height: 0, y: -12 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-sm overflow-hidden"
                >
                  <div className="modal-surface p-6 sm:p-8 flex flex-col items-center text-center">
                    {/* Avatar echo */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-accent mb-4 shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_20%,transparent)]">
                      {passwordPromptProfile.profilePic ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          className="h-full w-full object-cover" 
                          alt={passwordPromptProfile.name} 
                          src={passwordPromptProfile.profilePic} 
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center bg-foreground/[0.06]">
                          <span className="material-symbols-outlined text-[28px] text-muted">person</span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {isPasswordPromptForLogin ? `Login as ${passwordPromptProfile.name}` : passwordPromptProfile.name}
                    </h3>
                    <p className="text-[13px] text-muted mb-6">Enter PIN to continue</p>

                    <form onSubmit={handleProfileAccess} className="w-full flex flex-col items-center gap-4">
                      <div className="w-full max-w-[200px]">
                        <input
                          ref={passwordInputRef}
                          type="password"
                          value={profileAccessPassword}
                          onChange={(event) => setProfileAccessPassword(event.target.value)}
                          placeholder="••••••"
                          className="w-full bg-transparent border-b-2 border-card-border py-2.5 text-center text-2xl tracking-[0.5em] text-foreground font-mono focus:outline-none focus:border-b-accent transition-all placeholder:tracking-[0.3em] placeholder:text-lg placeholder:text-muted/40"
                          autoFocus
                        />
                        {(passwordPromptProfile.passwordHint || profileMessage || error) && (
                          <p className={`text-[12px] text-center mt-2.5 font-medium ${profileMessage || error ? 'text-red-400' : 'text-muted'}`}>
                            {profileMessage || error || `Hint: ${passwordPromptProfile.passwordHint}`}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 w-full mt-2">
                        <button 
                          type="button" 
                          onClick={handleBackFromPassword} 
                          className="btn-secondary flex-1 active:scale-[0.97]"
                        >
                          Back
                        </button>
                        <button 
                          type="submit" 
                          disabled={profileSaving} 
                          className="btn-primary flex-1 active:scale-[0.97]"
                        >
                          {profileSaving ? "Unlocking..." : "Unlock"}
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom actions */}
            <motion.div 
              className="flex items-center gap-6 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {canLogoutActiveProfile && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[13px] font-semibold text-muted/60 hover:text-red-400 transition-colors duration-200 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  Log Out
                </button>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
