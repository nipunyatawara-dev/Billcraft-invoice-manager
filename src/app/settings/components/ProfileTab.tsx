import { ChangeEvent, useEffect, useState } from "react";
import { CURRENCIES, type CurrencyCode, useCurrency } from "@/hooks/use-currency";
import { useUserData, type ProfileDraft } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatedText } from "@/components/animated-text";

export function ProfileTab() {
  const { currency, setCurrency, currencyMode, setCurrencyMode } = useCurrency();
  const { activeProfile, updateProfile } = useUserData();
  
  const [profileForm, setProfileForm] = useState<ProfileDraft>({
    name: "",
    profession: "",
    email: "",
    phone: "",
    businessName: "",
    defaultDeliveryLink: "",
    profilePic: "",
    signature: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!activeProfile) return;

    setProfileForm({
      name: activeProfile.name,
      profession: activeProfile.profession,
      email: activeProfile.email || "",
      phone: activeProfile.phone || "",
      businessName: activeProfile.businessName || "",
      defaultDeliveryLink: activeProfile.defaultDeliveryLink || "",
      profilePic: activeProfile.profilePic || "",
      signature: activeProfile.signature || "",
    });
  }, [activeProfile]);

  function handleProfileImageChange(field: "profilePic" | "signature", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileForm((current) => ({ ...current, [field]: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile() {
    if (isSavingProfile) return;

    if (!profileForm.name.trim() || !profileForm.profession.trim()) {
      notify.warning({
        title: "Profile details required",
        description: "Add your name and profession before saving.",
      });
      return;
    }

    setIsSavingProfile(true);

    try {
      await notifyPromise(updateProfile(profileForm), {
        loading: { title: "Saving profile...", description: "Updating the identity used on invoices." },
        success: { title: "Profile saved", description: "New invoice previews will use your latest details." },
        error: (error) => ({
          title: "Profile save failed",
          description: getToastErrorMessage(error, "Unable to update this profile."),
        }),
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Header */}
      <div className="surface-featured p-6 sm:p-8 relative overflow-hidden rounded-3xl group">
        {/* Subtle background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-action/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
          <div className="size-20 sm:size-24 rounded-2xl bg-background border-2 border-card-border flex items-center justify-center shrink-0 overflow-hidden relative group/avatar shadow-xl shadow-action/5 transition-transform duration-500 hover:scale-[1.02]">
            {profileForm.profilePic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="h-full w-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" alt={profileForm.name || "Profile"} src={profileForm.profilePic} />
            ) : (
              <span className="material-symbols-outlined text-4xl text-muted/50">person</span>
            )}
            
            {/* Hover overlay for changing photo */}
            <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm">
              <span className="material-symbols-outlined text-white text-[20px] mb-1">photo_camera</span>
              <span className="text-white text-[10px] font-bold tracking-wider uppercase">Update</span>
              <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleProfileImageChange("profilePic", event)} />
            </label>
          </div>
          
          <div className="flex-1">
            <AnimatedText
              as="h2"
              text={profileForm.name || "Your profile"}
              effect="micro-scale-fade"
              className="text-2xl sm:text-3xl font-bold text-featured-text font-display mb-1 tracking-tight"
              delayMs={70}
            />
            <AnimatedText as="p" text={profileForm.profession || "Set your profession"} className="text-[14px] text-featured-text/60 font-medium" />
          </div>
          
          <label className="hidden sm:flex items-center gap-2 bg-card border border-card-border hover:border-foreground/20 hover:bg-foreground/[0.02] text-foreground px-4 py-2 rounded-xl font-medium transition-all shadow-sm cursor-pointer backdrop-blur-md text-[14px]">
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            Change Photo
            <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleProfileImageChange("profilePic", event)} />
          </label>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div className="surface-card p-5 space-y-2 rounded-2xl group focus-within:ring-2 focus-within:ring-action/20 focus-within:border-action/30 transition-all duration-300 shadow-sm hover:shadow-md">
          <label className="flex items-center gap-2 text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="settings-name">
            <span className="material-symbols-outlined text-[14px] text-action/70">badge</span>
            Full Name
          </label>
          <input
            id="settings-name"
            type="text"
            value={profileForm.name}
            onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
            className="w-full bg-transparent border-none outline-none text-[15px] font-semibold text-foreground placeholder-muted/40 transition-colors"
            placeholder="John Doe"
          />
        </div>
        
        {/* Profession */}
        <div className="surface-card p-5 space-y-2 rounded-2xl group focus-within:ring-2 focus-within:ring-action/20 focus-within:border-action/30 transition-all duration-300 shadow-sm hover:shadow-md">
          <label className="flex items-center gap-2 text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="settings-profession">
            <span className="material-symbols-outlined text-[14px] text-action/70">work</span>
            Profession
          </label>
          <input
            id="settings-profession"
            type="text"
            value={profileForm.profession}
            onChange={(event) => setProfileForm({ ...profileForm, profession: event.target.value })}
            className="w-full bg-transparent border-none outline-none text-[15px] font-semibold text-foreground placeholder-muted/40 transition-colors"
            placeholder="Freelance Designer"
          />
        </div>

        {/* Email */}
        <div className="surface-card p-5 space-y-2 rounded-2xl group focus-within:ring-2 focus-within:ring-action/20 focus-within:border-action/30 transition-all duration-300 shadow-sm hover:shadow-md">
          <label className="flex items-center gap-2 text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="settings-email">
            <span className="material-symbols-outlined text-[14px] text-action/70">mail</span>
            Email Address
          </label>
          <input
            id="settings-email"
            type="email"
            value={profileForm.email}
            onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })}
            className="w-full bg-transparent border-none outline-none text-[15px] font-semibold text-foreground placeholder-muted/40 transition-colors"
            placeholder="hello@example.com"
          />
        </div>

        {/* Phone */}
        <div className="surface-card p-5 space-y-2 rounded-2xl group focus-within:ring-2 focus-within:ring-action/20 focus-within:border-action/30 transition-all duration-300 shadow-sm hover:shadow-md">
          <label className="flex items-center gap-2 text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="settings-phone">
            <span className="material-symbols-outlined text-[14px] text-action/70">call</span>
            Phone Number
          </label>
          <input
            id="settings-phone"
            type="text"
            value={profileForm.phone}
            onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
            className="w-full bg-transparent border-none outline-none text-[15px] font-semibold text-foreground placeholder-muted/40 transition-colors"
            placeholder="+1 234 567 8900"
          />
        </div>
      </div>

      {/* Business Details */}
      <div className="surface-card p-5 space-y-2 rounded-2xl group focus-within:ring-2 focus-within:ring-action/20 focus-within:border-action/30 transition-all duration-300 shadow-sm hover:shadow-md">
        <label className="flex items-center gap-2 text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="settings-business">
          <span className="material-symbols-outlined text-[14px] text-action/70">storefront</span>
          Business Name
        </label>
        <input
          id="settings-business"
          type="text"
          value={profileForm.businessName}
          onChange={(event) => setProfileForm({ ...profileForm, businessName: event.target.value })}
          className="w-full bg-transparent border-none outline-none text-[15px] font-semibold text-foreground placeholder-muted/40 transition-colors"
          placeholder="Acme Design Studio"
        />
      </div>

      <div className="surface-card p-5 space-y-2 rounded-2xl group focus-within:ring-2 focus-within:ring-action/20 focus-within:border-action/30 transition-all duration-300 shadow-sm hover:shadow-md">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="settings-delivery-link">
            <span className="material-symbols-outlined text-[14px] text-action/70">cloud</span>
            My Drive Location
          </label>
        </div>
        <input
          id="settings-delivery-link"
          type="url"
          value={profileForm.defaultDeliveryLink}
          onChange={(event) => setProfileForm({ ...profileForm, defaultDeliveryLink: event.target.value })}
          className="w-full bg-transparent border-none outline-none text-[15px] font-semibold text-foreground placeholder-muted/40 transition-colors"
          placeholder="https://drive.google.com/..."
        />
        <p className="text-[11px] text-muted/70 pt-1 border-t border-card-border/50 mt-2">Shows as the My Drive location option when choosing where finished work should go.</p>
      </div>

      {/* Signature & Currency Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Signature */}
        <div className="surface-card p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-4 text-[11px] font-bold text-muted tracking-wider uppercase">
            <span className="material-symbols-outlined text-[14px] text-action/70">draw</span>
            Invoice Signature
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-background/50 p-4 rounded-xl border border-card-border/50">
            <div className="h-20 w-36 rounded-lg border border-card-border overflow-hidden bg-white/5 flex items-center justify-center shrink-0 shadow-inner group/sig relative">
              {profileForm.signature ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="h-full w-full object-contain p-2" alt="Signature" src={profileForm.signature} />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/sig:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">edit</span>
                  </div>
                </>
              ) : (
                <span className="material-symbols-outlined text-muted/40 text-3xl">draw</span>
              )}
              <input className="absolute inset-0 opacity-0 cursor-pointer" type="file" accept="image/*" onChange={(event) => handleProfileImageChange("signature", event)} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-[13px] font-semibold text-foreground">Digital Signature</p>
              <p className="text-[11px] text-muted mt-1 mb-3">Appears at the bottom of generated invoices.</p>
              <label className="btn-secondary text-[11px] py-1.5 px-3 cursor-pointer hover:-translate-y-0.5 transition-transform inline-flex">
                <span className="material-symbols-outlined text-[14px]">upload</span>
                {profileForm.signature ? "Replace" : "Upload"}
                <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleProfileImageChange("signature", event)} />
              </label>
            </div>
          </div>
        </div>

        {/* Currency Details */}
        <div className="space-y-4">
          <div className="surface-card p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <label className="flex items-center gap-2 text-[11px] font-bold text-muted tracking-wider uppercase mb-3" htmlFor="currency">
              <span className="material-symbols-outlined text-[14px] text-action/70">payments</span>
              Base Currency
            </label>
            <div className="relative">
              <select
                id="currency"
                value={currency}
                onChange={(event) => {
                  const nextCurrency = event.target.value as CurrencyCode;
                  setCurrency(nextCurrency);
                  notify.info({ title: "Currency updated", description: `New invoice totals will use ${nextCurrency}.` });
                }}
                className="w-full appearance-none bg-background/50 border border-card-border rounded-xl px-4 py-3 text-[14px] font-semibold text-foreground outline-none focus:border-action focus:ring-2 focus:ring-action/20 transition-all cursor-pointer"
              >
                {CURRENCIES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code} - {option.label}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">expand_more</span>
            </div>
          </div>

          <div className="surface-card p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <label className="flex items-center justify-between text-[11px] font-bold text-muted tracking-wider uppercase mb-3" htmlFor="currency-mode">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-action/70">currency_exchange</span>
                Currency Conversion Mode
              </span>
            </label>
            <div className="relative mb-3">
              <select
                id="currency-mode"
                value={currencyMode}
                onChange={(event) => {
                  const nextMode = event.target.value as "visual" | "convert";
                  setCurrencyMode(nextMode);
                  notify.info({ title: "Currency mode updated", description: `Exchange rates will now be ${nextMode === "convert" ? "dynamically calculated" : "ignored (visual only)"}.` });
                }}
                className="w-full appearance-none bg-background/50 border border-card-border rounded-xl px-4 py-3 text-[14px] font-semibold text-foreground outline-none focus:border-action focus:ring-2 focus:ring-action/20 transition-all cursor-pointer"
              >
                <option value="visual">Visual Change Only (Symbol only)</option>
                <option value="convert">Convert Values (Dynamic Exchange Rate)</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">expand_more</span>
            </div>
            <div className="bg-action/5 border border-action/10 rounded-lg p-3">
              <p className="text-[11px] text-action/80 leading-relaxed font-medium">
                <strong className="text-action">Visual Change</strong> keeps numbers identical (just swaps $ to €). <strong className="text-action">Convert Mode</strong> actually scales totals mathematically by current exchange rates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 sticky bottom-6 z-20">
        <button 
          onClick={handleSaveProfile} 
          disabled={isSavingProfile}
          className="btn-primary shadow-lg shadow-action/20 hover:shadow-action/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 px-8 py-2.5 rounded-xl relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out rounded-xl" />
          <span className="relative z-10 flex items-center gap-2">
            {isSavingProfile ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Saving Profile...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                Save Changes
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
