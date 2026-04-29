"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedNumber } from "@/components/animated-number";
import { useModePalettes } from "@/hooks/use-mode-palettes";
import { useUserData, type ProfileDraft } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/invoices", label: "Invoices", icon: "receipt_long" },
  { href: "/clients", label: "Clients", icon: "group" },
  { href: "/outsourcing", label: "Outsourcing", icon: "engineering" },
  { href: "/analytics", label: "Analytics", icon: "bar_chart" },
];

const BOTTOM_NAV = [
  { href: "/settings", label: "Settings", icon: "settings" },
];

const EMPTY_PROFILE_FORM: ProfileDraft = {
  name: "",
  profession: "",
  email: "",
  phone: "",
  businessName: "",
  profilePic: "",
  signature: "",
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  useModePalettes();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationBadgeOpen, setIsNotificationBadgeOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showCreateProfileForm, setShowCreateProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileDraft>(EMPTY_PROFILE_FORM);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const pathname = usePathname();
  const {
    activeProfile,
    activeProfileId,
    createProfile,
    error,
    loading,
    profiles,
    switchProfile,
  } = useUserData();
  const isFirstRun = !loading && profiles.length === 0;

  useEffect(() => {
    if (isFirstRun) {
      setIsProfileModalOpen(true);
      setShowCreateProfileForm(true);
    }
  }, [isFirstRun]);

  useEffect(() => {
    const badgeTimer = window.setTimeout(() => setIsNotificationBadgeOpen(true), 120);

    return () => window.clearTimeout(badgeTimer);
  }, []);

  function closeSidebarOnMobile() {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setIsSidebarOpen(false);
    }
  }

  function closeProfileModal() {
    if (isFirstRun || profileSaving) {
      return;
    }

    setIsProfileModalOpen(false);
    setShowCreateProfileForm(false);
    setProfileForm(EMPTY_PROFILE_FORM);
    setProfileMessage("");
  }

  function handleProfileImageChange(field: "profilePic" | "signature", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

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

    if (profileSaving) {
      return;
    }

    if (!profileForm.name.trim() || !profileForm.profession.trim()) {
      notify.warning({
        title: "Profile details required",
        description: "Add your name and profession to create a profile.",
      });
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    try {
      await notifyPromise(createProfile(profileForm), {
        loading: {
          title: "Creating profile...",
          description: "Preparing your local invoice workspace.",
        },
        success: {
          title: "Profile created",
          description: `${profileForm.name.trim()} is ready for invoices.`,
        },
        error: (error) => ({
          title: "Profile creation failed",
          description: getToastErrorMessage(error, "Unable to create this profile."),
        }),
      });
      setProfileForm(EMPTY_PROFILE_FORM);
      setShowCreateProfileForm(false);
      setIsProfileModalOpen(false);
    } catch (createError) {
      setProfileMessage(createError instanceof Error ? createError.message : "Unable to create profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleProfileSwitch(profileId: string) {
    if (profileId === activeProfileId) {
      setIsProfileModalOpen(false);
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    try {
      const nextProfile = profiles.find((profile) => profile.id === profileId);

      await notifyPromise(switchProfile(profileId), {
        loading: {
          title: "Switching profile...",
          description: "Loading this profile's local billing data.",
        },
        success: {
          title: "Profile switched",
          description: nextProfile ? `Now working as ${nextProfile.name}.` : "Your selected profile is active.",
        },
        error: (error) => ({
          title: "Profile switch failed",
          description: getToastErrorMessage(error, "Unable to switch profiles."),
        }),
      });
      setIsProfileModalOpen(false);
    } catch (switchError) {
      setProfileMessage(switchError instanceof Error ? switchError.message : "Unable to switch profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  function handleNotificationsClick() {
    setIsNotificationBadgeOpen(false);

    if (error) {
      notify.error({
        title: "Data sync issue",
        description: error,
      });
      return;
    }

    if (!activeProfile) {
      notify.info({
        title: "Profile setup needed",
        description: "Create a profile to start saving invoices and clients.",
      });
      return;
    }

    notify.info({
      title: "All caught up",
      description: "No new billing notifications right now.",
    });
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--card-border)] bg-[var(--background)]/92 px-4 backdrop-blur-xl sm:px-5 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="icon-button active:scale-95"
            aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
          >
            <span className="material-symbols-outlined text-[20px]">{isSidebarOpen ? 'close' : 'menu'}</span>
          </button>
          <Link href="/" className="brand-lockup transition-smooth" aria-label="BillCraft dashboard">
            <span className="brand-mark">
              <Image
                src="/billcraft-dark-circle.png"
                alt=""
                fill
                sizes="34px"
                className="object-cover dark:hidden"
              />
              <Image
                src="/billcraft-light-circle.png"
                alt=""
                fill
                sizes="34px"
                className="hidden object-cover dark:block"
              />
            </span>
            <span className="brand-wordmark">BillCraft</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={handleNotificationsClick} className="icon-button active:scale-95 hidden sm:inline-flex relative" aria-label="Notifications">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="t-badge" data-open={isNotificationBadgeOpen ? "true" : "false"} aria-hidden="true">
              <span className="t-badge-dot" />
            </span>
          </button>
          <button
            onClick={() => {
              setIsProfileModalOpen(true);
              setShowCreateProfileForm(false);
              setProfileForm(EMPTY_PROFILE_FORM);
            }}
            className="size-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center cursor-pointer hover:bg-[var(--accent)]/15 transition-smooth overflow-hidden"
            aria-label="Profiles"
          >
            {activeProfile?.profilePic ? (
              <img className="h-full w-full object-cover" alt={activeProfile.name} src={activeProfile.profilePic} />
            ) : (
              <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">person</span>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar Overlay */}
        <div 
          className={`lg:hidden fixed inset-0 top-16 bg-[var(--foreground)]/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside 
          className={`bg-[var(--background)] flex flex-col fixed lg:sticky top-16 h-[calc(100vh-64px)] z-40 shrink-0 left-0 transition-all duration-300 ease-in-out overflow-hidden border-[var(--card-border)] ${
            isSidebarOpen ? "w-[240px] translate-x-0 border-r" : "w-[240px] lg:w-0 -translate-x-full lg:translate-x-0 border-r-0"
          }`}
        >
          <div className="w-[240px] flex flex-col h-full shrink-0">
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebarOnMobile}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-smooth ${
                      isActive
                        ? 'bg-[var(--action)]/12 text-[var(--action)]'
                        : 'text-[var(--foreground)]/55 hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]/80'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[var(--action)]' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 pb-4 pt-2 space-y-0.5 bg-transparent shrink-0">
              {BOTTOM_NAV.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebarOnMobile}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-smooth ${
                      isActive
                        ? 'bg-[var(--action)]/12 text-[var(--action)]'
                        : 'text-[var(--foreground)]/55 hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]/80'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[var(--action)]' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          {children}
        </div>
      </div>

      {(isProfileModalOpen || isFirstRun) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            aria-label="Close profile manager"
            className="absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm"
            onClick={closeProfileModal}
          />
          <div role="dialog" aria-modal="true" className="modal-surface relative max-w-3xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="section-eyebrow">{isFirstRun ? "Welcome" : "Profiles"}</p>
                <h2 className="text-2xl font-semibold text-[var(--foreground)] font-display">
                  {isFirstRun ? "Create your first profile" : "Manage profiles"}
                </h2>
                <p className="mt-1 text-[12px] text-[var(--muted)]">
                  <AnimatedNumber value={profiles.length} />/<AnimatedNumber value={5} /> profiles saved locally in the User data folder.
                </p>
              </div>
              {!isFirstRun && (
                <button onClick={closeProfileModal} className="size-8 flex items-center justify-center rounded-lg hover:bg-[var(--foreground)]/[0.04] transition-smooth">
                  <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">close</span>
                </button>
              )}
            </div>

            {profiles.length > 0 && (
              <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {profiles.map((profile) => {
                  const isActive = profile.id === activeProfileId;

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => void handleProfileSwitch(profile.id)}
                      className={`surface-card p-3 text-left flex items-center gap-3 transition-smooth ${
                        isActive ? "border-[var(--accent)]/50" : "hover:border-[var(--foreground)]/15"
                      }`}
                    >
                      <span className="size-11 rounded-lg overflow-hidden border border-[var(--card-border)] bg-[var(--foreground)]/[0.03] flex items-center justify-center shrink-0">
                        {profile.profilePic ? (
                          <img className="h-full w-full object-cover" alt={profile.name} src={profile.profilePic} />
                        ) : (
                          <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">person</span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[var(--foreground)] truncate">{profile.name}</span>
                        <span className="block text-[11px] text-[var(--muted)] truncate">{profile.profession}</span>
                      </span>
                      {isActive && (
                        <span className="ml-auto material-symbols-outlined text-[18px] text-[var(--accent)]">check_circle</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {!isFirstRun && !showCreateProfileForm && profiles.length < 5 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateProfileForm(true)}
                  className="btn-primary active:scale-[0.97]"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Create New Profile
                </button>
              </div>
            )}

            {(isFirstRun || showCreateProfileForm) && (
            <form onSubmit={handleCreateProfile} className={`space-y-4 ${profiles.length >= 5 ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="profile-name">Name</label>
                  <input
                    id="profile-name"
                    required
                    value={profileForm.name}
                    onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
                    placeholder="Your name"
                    className="field-control px-3 py-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="profile-profession">Profession</label>
                  <input
                    id="profile-profession"
                    required
                    value={profileForm.profession}
                    onChange={(event) => setProfileForm({ ...profileForm, profession: event.target.value })}
                    placeholder="Designer, developer, consultant"
                    className="field-control px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="profile-email">Email</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={profileForm.email}
                    onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })}
                    placeholder="you@example.com"
                    className="field-control px-3 py-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="profile-phone">Phone</label>
                  <input
                    id="profile-phone"
                    value={profileForm.phone}
                    onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
                    placeholder="+94 77 000 0000"
                    className="field-control px-3 py-2"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="profile-business">Business Name</label>
                <input
                  id="profile-business"
                  value={profileForm.businessName}
                  onChange={(event) => setProfileForm({ ...profileForm, businessName: event.target.value })}
                  placeholder="Studio or business name"
                  className="field-control px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="surface-card p-4">
                  <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-3">Profile Picture</p>
                  <div className="flex items-center gap-3">
                    <div className="size-14 rounded-lg border border-[var(--card-border)] overflow-hidden bg-[var(--foreground)]/[0.03] flex items-center justify-center shrink-0">
                      {profileForm.profilePic ? (
                        <img className="w-full h-full object-cover" alt="Profile preview" src={profileForm.profilePic} />
                      ) : (
                        <span className="material-symbols-outlined text-[var(--foreground)]/25">image</span>
                      )}
                    </div>
                    <label className="btn-secondary text-[12px] min-h-8 px-3 py-1.5 cursor-pointer">
                      <span>{profileForm.profilePic ? "Change" : "Upload"}</span>
                      <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleProfileImageChange("profilePic", event)} />
                    </label>
                  </div>
                </div>

                <div className="surface-card p-4">
                  <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-3">Signature</p>
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-24 rounded-lg border border-[var(--card-border)] overflow-hidden bg-[var(--foreground)]/[0.03] flex items-center justify-center shrink-0">
                      {profileForm.signature ? (
                        <img className="w-full h-full object-contain" alt="Signature preview" src={profileForm.signature} />
                      ) : (
                        <span className="material-symbols-outlined text-[var(--foreground)]/25">draw</span>
                      )}
                    </div>
                    <label className="btn-secondary text-[12px] min-h-8 px-3 py-1.5 cursor-pointer">
                      <span>{profileForm.signature ? "Change" : "Upload"}</span>
                      <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleProfileImageChange("signature", event)} />
                    </label>
                  </div>
                </div>
              </div>

              {(profileMessage || error) && (
                <p className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-2 text-[12px] font-medium text-[var(--accent)]">
                  {profileMessage || error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                {!isFirstRun && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateProfileForm(false);
                      setProfileForm(EMPTY_PROFILE_FORM);
                      setProfileMessage("");
                    }}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn-primary active:scale-[0.97]" disabled={profileSaving || profiles.length >= 5}>
                  {profileSaving ? "Saving..." : "Create Profile"}
                </button>
              </div>
            </form>
            )}

            {profiles.length >= 5 && (
              <p className="mt-4 text-[12px] text-[var(--muted)]">Profile limit reached. Switch between your existing profiles above.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
