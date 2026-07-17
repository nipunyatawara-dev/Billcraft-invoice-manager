import { ChangeEvent, useEffect, useState, useRef } from "react";
import { CURRENCIES, type CurrencyCode, useCurrency } from "@/hooks/use-currency";
import { useUserData, type ProfileDraft } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatedText } from "@/components/animated-text";
import { PhoneInput } from "@/components/phone-input";
import { useTheme } from "next-themes";
import { 
  User, 
  Camera, 
  Briefcase, 
  Mail, 
  Phone, 
  Store, 
  Cloud, 
  PenTool, 
  Upload, 
  Coins, 
  RefreshCw, 
  ChevronDown, 
  Loader2, 
  Save, 
  Globe, 
  CheckCircle2, 
  Users, 
  Plus, 
  Trash2, 
  Link as LinkIcon
} from "lucide-react";

export function ProfileTab() {
  const { theme } = useTheme();
  const activeTheme = theme === "dark" ? "dark" : "light";
  const { currency, setCurrency, currencyMode, setCurrencyMode } = useCurrency();
  const { activeProfile, updateProfile, profiles, activeProfileId, switchProfile } = useUserData();
  
  const [profileForm, setProfileForm] = useState<ProfileDraft>({
    name: "",
    profession: "",
    email: "",
    phone: "",
    businessName: "",
    taxId: "",
    website: "",
    defaultDeliveryLink: "",
    profilePic: "",
    signature: "",
  });
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"upload" | "draw">("upload");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!activeProfile) return;

    setProfileForm({
      name: activeProfile.name,
      profession: activeProfile.profession,
      email: activeProfile.email || "",
      phone: activeProfile.phone || "",
      businessName: activeProfile.businessName || "",
      taxId: activeProfile.taxId || "",
      website: activeProfile.website || "",
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
        notify.success({
          title: "Image loaded",
          description: `New ${field === "profilePic" ? "avatar" : "signature"} image is loaded in your draft.`,
        });
      }
    };
    reader.readAsDataURL(file);
  }

  // --- HTML5 Canvas Signature Draw Logic ---
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Support mouse and touch coordinate bounding
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Premium high contrast ink
    ctx.strokeStyle = activeTheme === "dark" ? "#FFFFFF" : "#111111";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    
    // Prevent mobile scrolling while drawing
    if (e.cancelable) e.preventDefault();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    if (e.cancelable) e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const saveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if canvas is empty (basic pixels test)
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const isCanvasEmpty = !buffer.data.some(channel => channel !== 0);

    if (isCanvasEmpty) {
      notify.warning({
        title: "Signature pad is empty",
        description: "Draw something on the canvas before saving.",
      });
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");
    setProfileForm(current => ({ ...current, signature: dataUrl }));
    notify.success({
      title: "Signature captured",
      description: "Drawn signature saved to your profile draft.",
    });
  };

  // --- Profile Completion Calculations ---
  const calculateCompletion = () => {
    let score = 0;
    const items = [
      { name: "Full Name", key: "name", weight: 15 },
      { name: "Professional Title", key: "profession", weight: 15 },
      { name: "Email Address", key: "email", weight: 15 },
      { name: "Phone Number", key: "phone", weight: 15 },
      { name: "Business / Company Name", key: "businessName", weight: 15 },
      { name: "Profile Photo", key: "profilePic", weight: 10 },
      { name: "Invoice Signature", key: "signature", weight: 15 },
    ] as const;

    const checklist = items.map(item => {
      const isFilled = !!profileForm[item.key as keyof ProfileDraft]?.toString().trim();
      if (isFilled) score += item.weight;
      return { ...item, checked: isFilled };
    });

    return { percentage: Math.min(score, 100), checklist };
  };

  const { percentage: completionPercent, checklist: completionChecklist } = calculateCompletion();

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
      
      {/* Two Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Main Column: Settings Form Fields (Spans 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Hero Identity Header */}
          <div className="surface-featured p-6 sm:p-8 relative overflow-hidden rounded-xl group border border-card-border/50">
            <div className="absolute inset-0 bg-gradient-to-r from-action/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
              <div className="size-20 sm:size-24 rounded-xl bg-background border-2 border-card-border flex items-center justify-center shrink-0 overflow-hidden relative group/avatar shadow-xl shadow-action/5 transition-transform duration-500 hover:scale-[1.02]">
                {profileForm.profilePic ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="h-full w-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" alt={profileForm.name || "Profile"} src={profileForm.profilePic} />
                ) : (
                  <User className="size-10 text-muted/50" />
                )}
                
                <label className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                  <Camera className="text-white size-5 mb-1" />
                  <span className="text-white text-[10px] font-bold tracking-wider uppercase">Update</span>
                  <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleProfileImageChange("profilePic", event)} />
                </label>
              </div>
              
              <div className="flex-1">
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-featured-text/50 tracking-wider uppercase mb-1">
                  Personal Workspace Profile
                </p>
                <AnimatedText
                  as="h2"
                  text={profileForm.name || "Your Profile"}
                  effect="micro-scale-fade"
                  className="text-2xl sm:text-3xl font-bold text-featured-text font-display mb-1 tracking-tight"
                  delayMs={70}
                />
                <p className="text-[13px] text-featured-text/60 font-medium">
                  {profileForm.profession || "Freelance Title / Occupation not set"}
                </p>
              </div>
              
              <label className="flex items-center gap-2 bg-card border border-card-border hover:border-foreground/20 hover:bg-foreground/[0.02] text-foreground px-4 py-2.5 rounded-lg font-medium transition-all shadow-xs cursor-pointer backdrop-blur-md text-[13px]">
                <Camera className="size-[18px]" />
                Change Photo
                <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleProfileImageChange("profilePic", event)} />
              </label>
            </div>
          </div>

          {/* Form Cards Grid */}
          <div className="space-y-4">
            
            {/* Form Section: Profile Identity */}
            <div className="surface-card p-5 rounded-xl border border-card-border/60 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2 border-b border-card-border/50 pb-2">
                Personal Identity
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider" htmlFor="profile-name">Full Name</label>
                  <input
                    id="profile-name"
                    type="text"
                    value={profileForm.name}
                    onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
                    className="w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    placeholder="E.g. John Doe"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider" htmlFor="profile-profession">Professional Title</label>
                  <input
                    id="profile-profession"
                    type="text"
                    value={profileForm.profession}
                    onChange={(event) => setProfileForm({ ...profileForm, profession: event.target.value })}
                    className="w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    placeholder="E.g. Fullstack Engineer"
                  />
                </div>
              </div>
            </div>

            {/* Form Section: Contact details */}
            <div className="surface-card p-5 rounded-xl border border-card-border/60 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2 border-b border-card-border/50 pb-2">
                Contact Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider" htmlFor="profile-email">Email Address</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={profileForm.email}
                    onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })}
                    className="w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    placeholder="hello@domain.com"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider" htmlFor="profile-phone">Phone Number</label>
                  <PhoneInput
                    id="profile-phone"
                    value={profileForm.phone || ""}
                    onChange={(phone) => setProfileForm({ ...profileForm, phone })}
                    hintPhone={profileForm.phone}
                    inputClassName="text-sm font-semibold bg-background rounded-lg"
                    selectClassName="text-xs bg-background rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Form Section: Company Details */}
            <div className="surface-card p-5 rounded-xl border border-card-border/60 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2 border-b border-card-border/50 pb-2">
                Company Profile
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider" htmlFor="profile-business">Business Name</label>
                  <input
                    id="profile-business"
                    type="text"
                    value={profileForm.businessName}
                    onChange={(event) => setProfileForm({ ...profileForm, businessName: event.target.value })}
                    className="w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    placeholder="E.g. Acme Design Studio"
                  />
                </div>

                <div className="md:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider" htmlFor="profile-taxid">VAT / Tax ID</label>
                  <input
                    id="profile-taxid"
                    type="text"
                    value={profileForm.taxId}
                    onChange={(event) => setProfileForm({ ...profileForm, taxId: event.target.value })}
                    className="w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    placeholder="E.g. US123456789"
                  />
                </div>

                <div className="md:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider" htmlFor="profile-website">Website URL</label>
                  <input
                    id="profile-website"
                    type="text"
                    value={profileForm.website}
                    onChange={(event) => setProfileForm({ ...profileForm, website: event.target.value })}
                    className="w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    placeholder="E.g. www.acme.com"
                  />
                </div>
              </div>
            </div>

            {/* Form Section: Signature Custom Canvas Pad */}
            <div className="surface-card p-5 rounded-xl border border-card-border/60 space-y-4">
              <div className="flex items-center justify-between border-b border-card-border/50 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                  Invoice Signature
                </h3>
                
                {/* Signature Source Mode Toggle Switch */}
                <div className="flex border border-card-border rounded-lg p-0.5 bg-background">
                  <button
                    type="button"
                    onClick={() => setSignatureMode("upload")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${signatureMode === "upload" ? "bg-action text-action-text shadow-xs" : "text-muted hover:text-foreground"}`}
                  >
                    Upload Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureMode("draw")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${signatureMode === "draw" ? "bg-action text-action-text shadow-xs" : "text-muted hover:text-foreground"}`}
                  >
                    Draw Signature
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Interactive Drawing Pad or File Upload Panel */}
                <div className="md:col-span-7 bg-background/50 rounded-xl border border-card-border/50 p-4 min-h-[175px] flex flex-col justify-center">
                  {signatureMode === "draw" ? (
                    <div className="space-y-3">
                      <div className="relative border border-card-border/60 rounded-lg overflow-hidden bg-white/5 shadow-inner">
                        <canvas
                          ref={canvasRef}
                          width={320}
                          height={110}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-[110px] cursor-crosshair touch-none"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="px-3 py-1.5 text-[11px] font-bold text-muted hover:text-foreground border border-card-border hover:bg-foreground/[0.02] rounded-lg transition-all"
                        >
                          Clear Board
                        </button>
                        <button
                          type="button"
                          onClick={saveDrawnSignature}
                          className="px-4 py-1.5 text-[11px] font-bold bg-action text-action-text hover:bg-action-hover rounded-lg transition-all flex items-center gap-1 shadow-xs"
                        >
                          Capture Signature
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Upload className="size-8 text-muted/30 mx-auto mb-2" />
                      <p className="text-[12px] font-semibold text-foreground">Upload signature image file</p>
                      <p className="text-[10px] text-muted mt-0.5 mb-3">Accepts PNG, JPG, or SVG transparent images.</p>
                      
                      <label className="btn-secondary text-[11px] py-1.5 px-4 cursor-pointer hover:-translate-y-0.5 transition-transform inline-flex items-center gap-1.5 rounded-lg">
                        <Upload className="size-3.5" />
                        Select File
                        <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleProfileImageChange("signature", event)} />
                      </label>
                    </div>
                  )}
                </div>
                
                {/* Signature Preview Panel */}
                <div className="md:col-span-5 flex flex-col justify-center items-center text-center p-4 border border-card-border/40 rounded-xl bg-foreground/[0.015]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted/80 mb-3">Signature Preview</p>
                  <div className="h-20 w-full rounded-lg border border-card-border/60 bg-white/5 flex items-center justify-center relative overflow-hidden group/sig shadow-inner">
                    {profileForm.signature ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover/sig:scale-105" alt="Signature" src={profileForm.signature} />
                        <button 
                          type="button"
                          onClick={() => setProfileForm(c => ({ ...c, signature: "" }))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover/sig:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-[11px] font-bold"
                        >
                          <Trash2 className="size-4" />
                          Delete Signature
                        </button>
                      </>
                    ) : (
                      <PenTool className="text-muted/20 size-8 animate-pulse" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted mt-2">Appears at the footer of generated invoices.</p>
                </div>
              </div>
            </div>

            {/* Form Section: Cloud Integrations */}
            <div className="surface-card p-5 rounded-xl border border-card-border/60 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2 border-b border-card-border/50 pb-2">
                Integrations
              </h3>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider" htmlFor="profile-delivery">Default Google Drive Delivery Directory</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted size-4" />
                    <input
                      id="profile-delivery"
                      type="url"
                      value={profileForm.defaultDeliveryLink}
                      onChange={(event) => setProfileForm({ ...profileForm, defaultDeliveryLink: event.target.value })}
                      className="w-full bg-background border border-card-border rounded-lg pl-9 pr-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                      placeholder="https://drive.google.com/drive/folders/..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (profileForm.defaultDeliveryLink?.trim()) {
                        window.open(profileForm.defaultDeliveryLink, "_blank");
                      } else {
                        notify.warning({ title: "Link is empty", description: "Enter a URL to test first." });
                      }
                    }}
                    className="btn-secondary px-4 text-xs font-bold rounded-lg border border-card-border flex items-center gap-1.5 shrink-0"
                  >
                    Test Link
                  </button>
                </div>
                <p className="text-[10px] text-muted/60 leading-normal">
                  Shows as the default destination option when organizing client deliverables to your cloud storage.
                </p>
              </div>
            </div>

            {/* Form Section: Base Currency & Localization */}
            <div className="surface-card p-5 rounded-xl border border-card-border/60 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2 border-b border-card-border/50 pb-2">
                Localization & Currency
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider" htmlFor="profile-currency">Base Currency</label>
                  <div className="relative">
                    <select
                      id="profile-currency"
                      value={currency}
                      onChange={(event) => {
                        const nextCurrency = event.target.value as CurrencyCode;
                        setCurrency(nextCurrency);
                        notify.info({ title: "Currency updated", description: `New invoice totals will render in ${nextCurrency}.` });
                      }}
                      className="w-full appearance-none bg-background border border-card-border rounded-lg pl-3 pr-10 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all cursor-pointer"
                    >
                      {CURRENCIES.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.code} — {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted size-4 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider" htmlFor="profile-currmode">Conversion Mode</label>
                  <div className="relative">
                    <select
                      id="profile-currmode"
                      value={currencyMode}
                      onChange={(event) => {
                        const nextMode = event.target.value as "visual" | "convert";
                        setCurrencyMode(nextMode);
                        notify.info({ title: "Currency mode updated", description: `Exchange rates will now be ${nextMode === "convert" ? "dynamically calculated" : "ignored (visual only)"}.` });
                      }}
                      className="w-full appearance-none bg-background border border-card-border rounded-lg pl-3 pr-10 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all cursor-pointer"
                    >
                      <option value="visual">Visual Symbol Swap Only</option>
                      <option value="convert">Convert Values via Live Exchange Rates</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted size-4 pointer-events-none" />
                  </div>
                </div>
              </div>
              
              <div className="bg-action/5 border border-action/10 rounded-lg p-3 mt-2">
                <p className="text-[11px] text-action/85 leading-relaxed font-medium">
                  <strong className="text-action">Visual Symbol</strong> swaps currency tags only (keeps totals identical). <strong className="text-action">Convert Mode</strong> scales numeric totals mathematically based on current exchange rates when rendering.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Meters, Accounts Switcher (Spans 1 column) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Widget 1: Setup Completion Meter */}
          <div className="surface-card p-5 rounded-xl border border-card-border/60 flex flex-col items-center text-center shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-4 self-start flex items-center gap-2">
              Profile Completeness
            </h3>

            {/* Circular Progress SVG Gauge */}
            <div className="relative size-24 mb-4">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-card-border/30"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-accent transition-all duration-1000 ease-out"
                  strokeWidth="3.2"
                  strokeDasharray={`${completionPercent}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-foreground">{completionPercent}%</span>
                <span className="text-[8px] font-bold text-muted uppercase tracking-widest leading-none">Status</span>
              </div>
            </div>

            <div className="w-full space-y-2 text-left border-t border-card-border/40 pt-4">
              {completionChecklist.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-[11px] font-semibold">
                  <span className={item.checked ? "text-foreground" : "text-muted/40"}>{item.name}</span>
                  <span className={item.checked ? "text-positive font-bold" : "text-accent/60"}>
                    {item.checked ? "✓ Complete" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 3: Profiles Account Switcher */}
          <div className="surface-card p-5 rounded-xl border border-card-border/60 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-card-border/40 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                Active Accounts
              </h3>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {profiles.map((profileItem) => {
                const isActive = profileItem.id === activeProfileId;
                return (
                  <div 
                    key={profileItem.id}
                    className={`p-3 rounded-lg border text-left flex items-center justify-between gap-3 transition-all ${
                      isActive 
                        ? "border-accent bg-action/5 shadow-xs" 
                        : "border-card-border bg-background/30 hover:border-foreground/15 hover:bg-foreground/[0.01]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-card-border/50 shadow-xs">
                        {profileItem.profilePic ? (
                          <img src={profileItem.profilePic} alt={profileItem.name} className="h-full w-full object-cover" />
                        ) : (
                          profileItem.name[0].toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[12px] font-bold text-foreground truncate leading-snug">{profileItem.name}</span>
                        <span className="block text-[10px] text-muted truncate leading-snug">{profileItem.profession}</span>
                      </div>
                    </div>

                    {isActive ? (
                      <span className="text-[9px] font-bold bg-accent/15 text-accent border border-accent/20 px-2 py-0.5 rounded uppercase tracking-wider">Active</span>
                    ) : (
                      <button
                        onClick={() => {
                          notifyPromise(switchProfile(profileItem.id), {
                            loading: { title: "Switching profile...", description: `Activating ${profileItem.name}'s workspace.` },
                            success: { title: "Profile active", description: `Active profile set to ${profileItem.name}.` },
                            error: (err) => ({ title: "Switch failed", description: getToastErrorMessage(err) })
                          });
                        }}
                        className="text-[10px] font-bold text-muted hover:text-foreground hover:bg-foreground/[0.04] px-2.5 py-1 border border-card-border rounded-md transition-all shadow-xs cursor-pointer"
                      >
                        Switch
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Sticky Save Button Bar */}
      <div className="flex justify-end pt-4 sticky bottom-6 z-20">
        <button 
          onClick={handleSaveProfile} 
          disabled={isSavingProfile}
          className="btn-primary shadow-lg shadow-action/25 hover:shadow-action/45 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 px-8 py-2.5 rounded-xl relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out rounded-xl" />
          <span className="relative z-10 flex items-center gap-2">
            {isSavingProfile ? (
              <>
                <Loader2 className="animate-spin size-[18px]" />
                Saving Profile...
              </>
            ) : (
              <>
                <Save className="size-[18px]" />
                Save Changes
              </>
            )}
          </span>
        </button>
      </div>
      
    </div>
  );
}
