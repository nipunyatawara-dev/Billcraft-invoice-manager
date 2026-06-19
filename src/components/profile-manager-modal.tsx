import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { AnimatedText } from "@/components/animated-text";
import { AnimatedNumber } from "@/components/animated-number";
import { ProfileCreateOnboarding } from "@/components/profile-create-onboarding";
import { useUserData, type ProfileDraft } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { cn } from "@/lib/utils";

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

  function handleClose() {
    if (isFirstRun || profileSaving || isProfileLocked) {
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
      handleClose();
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

  if (!isOpen && !isFirstRun) {
    return null;
  }

  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const passwordPromptProfile = profiles.find((profile) => profile.id === (pendingSwitchProfileId || (isProfileLocked ? activeProfileId : null)));
  const isPasswordPromptForLogin = Boolean(passwordPromptProfile && passwordPromptProfile.id === activeProfileId && isProfileLocked);
  const canLogoutActiveProfile = Boolean(activeProfile && !isProfileLocked);
  const isCreatingProfile = isFirstRun || showCreateProfileForm;
  const isLoggingIn = isProfileLocked || pendingSwitchProfileId !== null;
  const showPremiumBg = isCreatingProfile || isLoggingIn;
  const profileModalEyebrow = isFirstRun ? "Welcome" : isProfileLocked ? "Login" : "Profiles";
  const profileModalTitle = isFirstRun ? "Create your first profile" : isProfileLocked ? "Enter profile password" : "Manage profiles";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
        {!isCreatingProfile && (
          <div className="absolute -inset-4 bg-accent/15 blur-[100px] rounded-[40px] z-0 animate-pulse-slow pointer-events-none"></div>
        )}
        <div
          role="dialog"
          aria-modal="true"
          className={`modal-surface relative z-10 max-h-[92vh] w-full overflow-y-auto shadow-2xl shadow-accent/10 border border-white/5 backdrop-blur-xl ${isCreatingProfile ? "max-w-4xl p-0" : "max-w-3xl p-5 sm:p-7"}`}
        >
          {!isCreatingProfile && (
            <>
              <div className="relative flex flex-col items-center text-center mb-12 z-10">
                <AnimatedText as="h2" text={profileModalEyebrow} effect="micro-scale-fade" className="text-[14px] font-bold text-accent uppercase tracking-widest mb-2" replayKey={profileModalEyebrow} />
                <AnimatedText as="h1" text={profileModalTitle} effect="micro-scale-fade" className="text-3xl font-bold text-foreground mb-3" replayKey={profileModalTitle} />
                <p className="text-[17px] text-muted">
                  <AnimatedNumber value={profiles.length} />/<AnimatedNumber value={5} /> profiles saved locally.
                </p>
                {!isFirstRun && !isProfileLocked && (
                  <button onClick={handleClose} className="absolute top-0 right-0 text-muted hover:text-accent transition-colors duration-200">
                    <span className="material-symbols-outlined text-[24px]">close</span>
                  </button>
                )}
              </div>

              {profiles.length > 0 && (
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="flex flex-col gap-6">
                    <h3 className="text-2xl font-bold text-foreground pb-4 border-b border-card-border">Select Profile</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {profiles.map((profile) => {
                        const isSelectedForLogin = passwordPromptProfile?.id === profile.id;
                        
                        return (
                          <button
                            key={profile.id}
                            type="button"
                            onClick={() => void handleProfileSwitch(profile.id)}
                            className={`rounded-[18px] p-6 flex flex-col items-center text-center cursor-pointer relative transition-all ${
                              isSelectedForLogin
                                ? "bg-foreground/[0.05] border-2 border-accent shadow-[0_8px_24px_color-mix(in_srgb,var(--accent)_10%,transparent)] hover:scale-105"
                                : "bg-background border border-transparent opacity-70 hover:opacity-100 hover:bg-foreground/[0.03]"
                            }`}
                          >
                            <span 
                              className={`material-symbols-outlined absolute top-4 right-4 text-lg ${isSelectedForLogin ? 'text-accent' : 'text-muted'}`}
                              style={isSelectedForLogin ? { fontVariationSettings: "'FILL' 1" } : undefined}
                            >
                              {isSelectedForLogin ? "check_circle" : "lock"}
                            </span>
                            
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm ${isSelectedForLogin ? 'bg-foreground text-accent' : 'bg-foreground/[0.1] text-muted'}`}>
                              {profile.profilePic ? (
                                <img className="h-full w-full object-cover rounded-full" alt={profile.name} src={profile.profilePic} />
                              ) : (
                                <span className="material-symbols-outlined text-3xl">person</span>
                              )}
                            </div>
                            <h4 className="text-[14px] font-bold text-foreground truncate w-full">{profile.name}</h4>
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="mt-2 space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateProfileForm(true)}
                        disabled={profiles.length >= 5}
                        className="rounded-xl w-full py-4 border border-dashed border-card-border text-muted text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-foreground/[0.03] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined">add</span>
                        CREATE NEW PROFILE
                      </button>

                      {canLogoutActiveProfile && (
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="rounded-xl w-full py-4 border border-dashed border-red-500/30 text-red-400 text-[14px] font-bold flex items-center justify-center gap-2 hover:border-red-500 hover:bg-red-500/5 transition-colors"
                        >
                          <span className="material-symbols-outlined">logout</span>
                          LOG OUT
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    <h3 className="text-2xl font-bold text-foreground pb-4 border-b border-card-border">Authentication</h3>
                    
                    <div className="relative h-full flex-grow">
                      <div className={`rounded-[18px] p-8 flex flex-col items-center text-center h-full justify-center relative z-10 transition-colors ${passwordPromptProfile ? 'bg-foreground/[0.05] border border-accent/30' : 'bg-foreground/[0.03] border border-white/5'}`}>
                      {passwordPromptProfile ? (
                      <form onSubmit={handleProfileAccess} className="w-full flex flex-col items-center z-10">
                        <div className="relative w-20 h-20 mb-6 group">
                          <div className="w-full h-full rounded-full bg-foreground flex items-center justify-center shadow-[0_0_30px_color-mix(in_srgb,var(--accent)_25%,transparent)] border-[3px] border-accent overflow-hidden transition-transform duration-300 group-hover:scale-105">
                            {passwordPromptProfile.profilePic ? (
                              <img className="h-full w-full object-cover" alt={passwordPromptProfile.name} src={passwordPromptProfile.profilePic} />
                            ) : (
                              <span className="material-symbols-outlined text-4xl text-background">person</span>
                            )}
                          </div>
                        </div>
                        <h4 className="text-2xl font-bold text-foreground mb-2">
                          {isPasswordPromptForLogin ? `Login as ${passwordPromptProfile.name}` : `Switch to ${passwordPromptProfile.name}`}
                        </h4>
                        <p className="text-[17px] text-muted mb-8">Enter PIN to access profile</p>
                        
                        <div className="w-full max-w-[240px] mb-8 relative">
                          <input
                            ref={passwordInputRef}
                            type="password"
                            value={profileAccessPassword}
                            onChange={(event) => setProfileAccessPassword(event.target.value)}
                            placeholder="••••••"
                            className="w-full bg-transparent border-b border-card-border py-2 text-center text-2xl tracking-[0.5em] text-foreground font-mono focus:outline-none focus:border-b-accent transition-all placeholder:tracking-[0.3em] placeholder:text-lg placeholder:text-muted/40"
                            autoFocus
                          />
                          {(passwordPromptProfile.passwordHint || profileMessage || error) && (
                            <p className={`text-[12px] text-center mt-3 font-medium ${profileMessage || error ? 'text-red-400' : 'text-muted'}`}>
                              {profileMessage || error || `Hint: ${passwordPromptProfile.passwordHint}`}
                            </p>
                          )}
                        </div>
                        
                        <button type="submit" disabled={profileSaving} className="rounded-xl w-full bg-foreground text-background font-bold text-[14px] py-4 hover:opacity-90 transition-opacity disabled:opacity-50 mt-auto active:scale-[0.98]">
                          {profileSaving ? "Unlocking..." : "Unlock Profile"}
                        </button>
                      </form>
                    ) : (
                      <div className="flex flex-col items-center justify-center z-10 text-center opacity-60">
                        <span className="material-symbols-outlined text-4xl mb-3 text-muted">shield_person</span>
                        <p className="text-sm text-muted">Select a profile to authenticate</p>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              </div>
            )}
          </>
        )}

        {isCreatingProfile && (
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
        )}
      </div>
      </div>
    </div>
  );
}
