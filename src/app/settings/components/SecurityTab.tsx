import { useEffect, useState } from "react";
import { useUserData } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatedText } from "@/components/animated-text";
import { ShieldAlert, Lock, Key, Fingerprint, Loader2, Save, Brain, Lightbulb, AlertTriangle, AlertOctagon, UserMinus, Flame } from "lucide-react";

export function SecurityTab() {
  const {
    activeProfile, activeProfileId, changeProfilePassword, updateProfilePasswordHint,
    deleteProfile, deleteAllProfiles
  } = useUserData();

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", password: "", confirmPassword: "" });
  const [hintForm, setHintForm] = useState({ currentPassword: "", passwordHint: "" });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingHint, setIsSavingHint] = useState(false);

  useEffect(() => {
    if (!activeProfile) return;
    setPasswordForm({ currentPassword: "", password: "", confirmPassword: "" });
    setHintForm({ currentPassword: "", passwordHint: activeProfile.passwordHint || "" });
  }, [activeProfile]);

  function formatPasswordChangedAt(value?: string) {
    if (!value) return activeProfile?.hasPassword ? "Last changed date unavailable" : "No password set";
    return `Last changed ${new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }

  async function handleSavePassword() {
    if (isSavingPassword || !activeProfileId) return;

    if (passwordForm.password.length < 6) {
      notify.warning({ title: "Password too short", description: "Use at least 6 characters. Numbers-only passwords are allowed." });
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      notify.warning({ title: "Passwords do not match", description: "Confirm the same new password before saving." });
      return;
    }

    setIsSavingPassword(true);
    try {
      await notifyPromise(changeProfilePassword({
        currentPassword: passwordForm.currentPassword,
        password: passwordForm.password,
      }), {
        loading: { title: "Saving password...", description: "Updating this profile password." },
        success: { title: "Password saved", description: "This profile will ask for the new password next login." },
        error: (error) => ({ title: "Password save failed", description: getToastErrorMessage(error, "Unable to change this password.") }),
      });
      setPasswordForm({ currentPassword: "", password: "", confirmPassword: "" });
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleSavePasswordHint() {
    if (isSavingHint || !activeProfileId) return;

    setIsSavingHint(true);
    try {
      await notifyPromise(updateProfilePasswordHint({
        currentPassword: hintForm.currentPassword,
        passwordHint: hintForm.passwordHint,
      }), {
        loading: { title: "Saving hint...", description: "Updating this profile password hint." },
        success: { title: "Hint saved", description: "This hint will show on password prompts." },
        error: (error) => ({ title: "Hint save failed", description: getToastErrorMessage(error, "Unable to update this hint.") }),
      });
      setHintForm((curr) => ({ ...curr, currentPassword: "" }));
    } finally {
      setIsSavingHint(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      
      {/* Security Hero */}
      <div className="surface-featured p-6 sm:p-8 relative overflow-hidden rounded-xl group">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="flex flex-col sm:flex-row items-start gap-5 relative z-10">
          <div>
            <AnimatedText
              as="h2"
              text="Account Security"
              effect="micro-scale-fade"
              className="text-2xl font-bold text-featured-text font-display mb-1.5 tracking-tight"
              delayMs={70}
            />
            <p className="text-[14px] text-featured-text/70 font-medium">Manage your password, recovery hint, and control data retention.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Password Card */}
        <div className="surface-card p-6 sm:p-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-bold text-foreground tracking-tight">Profile Password</h3>
              <p className="text-[12px] font-semibold text-muted mt-1 tracking-wide uppercase">{formatPasswordChangedAt(activeProfile?.passwordChangedAt)}</p>
            </div>
          </div>

          <div className="space-y-4">
            {activeProfile?.hasPassword && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-2" htmlFor="current-password">
                  <Key className="size-3.5 opacity-70" />
                  Current Password
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full bg-foreground/[0.03] border border-card-border rounded-lg px-4 py-3 text-[14px] font-semibold text-foreground outline-none focus:border-action focus:ring-2 focus:ring-action/20 transition-all"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-2" htmlFor="new-password">
                <ShieldAlert className="size-3.5 opacity-70" />
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                minLength={6}
                value={passwordForm.password}
                onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                className="w-full bg-foreground/[0.03] border border-card-border rounded-lg px-4 py-3 text-[14px] font-semibold text-foreground outline-none focus:border-action focus:ring-2 focus:ring-action/20 transition-all"
              />
              <p className="text-[11px] text-muted/80 pl-1">Minimum 6 characters. Numbers-only is fine.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-2" htmlFor="confirm-new-password">
                <Lock className="size-3.5 opacity-70" />
                Confirm New Password
              </label>
              <input
                id="confirm-new-password"
                type="password"
                minLength={6}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full bg-foreground/[0.03] border border-card-border rounded-lg px-4 py-3 text-[14px] font-semibold text-foreground outline-none focus:border-action focus:ring-2 focus:ring-action/20 transition-all"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleSavePassword} 
              className="btn-primary shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none px-6 py-2.5 rounded-lg w-full sm:w-auto flex justify-center items-center gap-2" 
              disabled={isSavingPassword || !activeProfileId}
            >
              {isSavingPassword ? <Loader2 className="animate-spin size-[18px]" /> : <Save className="size-[18px]" />}
              {isSavingPassword ? "Saving..." : activeProfile?.hasPassword ? "Update Password" : "Set Password"}
            </button>
          </div>
        </div>

        {/* Password Hint Card */}
        <div className="surface-card p-6 sm:p-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group h-fit">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-bold text-foreground tracking-tight">Recovery Hint</h3>
              <p className="text-[12px] font-medium text-muted mt-1">Saved separately from your password.</p>
            </div>
          </div>

          <div className="space-y-4">
            {activeProfile?.hasPassword && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-2" htmlFor="hint-current-password">
                  <Key className="size-3.5 opacity-70" />
                  Current Password
                </label>
                <input
                  id="hint-current-password"
                  type="password"
                  value={hintForm.currentPassword}
                  onChange={(e) => setHintForm({ ...hintForm, currentPassword: e.target.value })}
                  className="w-full bg-foreground/[0.03] border border-card-border rounded-lg px-4 py-3 text-[14px] font-semibold text-foreground outline-none focus:border-action focus:ring-2 focus:ring-action/20 transition-all"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-2" htmlFor="password-hint">
                <Lightbulb className="size-3.5 opacity-70" />
                Hint
              </label>
              <input
                id="password-hint"
                type="text"
                value={hintForm.passwordHint}
                onChange={(e) => setHintForm({ ...hintForm, passwordHint: e.target.value })}
                className="w-full bg-foreground/[0.03] border border-card-border rounded-lg px-4 py-3 text-[14px] font-semibold text-foreground outline-none focus:border-action focus:ring-2 focus:ring-action/20 transition-all"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleSavePasswordHint} 
              className="btn-secondary shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none px-6 py-2.5 rounded-lg w-full sm:w-auto flex justify-center items-center gap-2" 
              disabled={isSavingHint || !activeProfileId}
            >
              {isSavingHint ? <Loader2 className="animate-spin size-[18px]" /> : <Save className="size-[18px]" />}
              {isSavingHint ? "Saving..." : "Save Hint"}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="surface-card p-6 sm:p-8 rounded-xl border-2 border-red-500/20 bg-red-500/[0.02] relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500 pointer-events-none">
          <AlertTriangle className="size-24 text-red-500" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-[18px] font-bold text-red-500 tracking-tight">Danger Zone</h3>
          </div>
          <p className="text-[13px] font-medium text-red-500/80 mb-6 max-w-xl">Permanently delete profile data. This action bypasses the trash bin and cannot be undone.</p>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <button
              onClick={async () => {
                if (confirm("Are you sure you want to delete the current profile?")) {
                  await notifyPromise(deleteProfile(), {
                    loading: { title: "Deleting profile...", description: "Please wait." },
                    success: { title: "Profile deleted", description: "The current profile has been removed." },
                    error: (e) => ({ title: "Delete failed", description: getToastErrorMessage(e, "Unable to delete profile.") })
                  });
                }
              }}
              className="px-6 py-3 border border-red-500/30 rounded-lg text-[13px] font-bold text-red-500 hover:bg-red-500/10 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <UserMinus className="size-[18px]" />
              Delete Current Profile
            </button>
            <button
              onClick={async () => {
                if (confirm("Are you sure you want to delete ALL profiles?")) {
                  await notifyPromise(deleteAllProfiles(), {
                    loading: { title: "Deleting all profiles...", description: "Please wait." },
                    success: { title: "Profiles deleted", description: "All profiles have been removed." },
                    error: (e) => ({ title: "Delete failed", description: getToastErrorMessage(e, "Unable to delete profiles.") })
                  });
                }
              }}
              className="px-6 py-3 border border-transparent rounded-lg text-[13px] font-bold text-white bg-red-500 hover:bg-red-600 active:scale-95 shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Flame className="size-[18px]" />
              Delete All Profiles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
