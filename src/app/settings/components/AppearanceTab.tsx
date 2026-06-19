import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { COLOR_PALETTES, type ColorPaletteId, useModePalettes } from "@/hooks/use-mode-palettes";
import { notify } from "@/lib/toast";
import { AnimatedText } from "@/components/animated-text";

type ThemeMode = "light" | "dark";

export function AppearanceTab() {
  const { resolvedTheme, setTheme } = useTheme();
  const { lightPalette, darkPalette, setLightPalette, setDarkPalette } = useModePalettes();
  
  const activeTheme = resolvedTheme === "dark" ? "dark" : "light";
  const [activeFont, setActiveFont] = useState<string>("inter");
  const [activeRadius, setActiveRadius] = useState<string>("rounded");
  const [isLightPaletteCollapsed, setIsLightPaletteCollapsed] = useState(false);
  const [isDarkPaletteCollapsed, setIsDarkPaletteCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedFont = window.localStorage.getItem("billcraft.font.v1");
      if (storedFont) setActiveFont(storedFont);
      
      const storedRadius = window.localStorage.getItem("billcraft.radius.v1");
      if (storedRadius) setActiveRadius(storedRadius);
    }
  }, []);

  useEffect(() => {
    if (activeTheme === "light") {
      setIsLightPaletteCollapsed(false);
      setIsDarkPaletteCollapsed(true);
    } else {
      setIsLightPaletteCollapsed(true);
      setIsDarkPaletteCollapsed(false);
    }
  }, [activeTheme]);

  const handleFontChange = (fontId: string) => {
    setActiveFont(fontId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("billcraft.font.v1", fontId);
      // eslint-disable-next-line
      document.documentElement.dataset.font = fontId;
      notify.success({
        title: "Font style updated",
        description: `Font style set to ${fontId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}.`,
      });
    }
  };

  const handleRadiusChange = (radiusId: string) => {
    setActiveRadius(radiusId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("billcraft.radius.v1", radiusId);
      // eslint-disable-next-line
      document.documentElement.dataset.radius = radiusId;
      notify.success({
        title: "Corner style updated",
        description: `Corner style set to ${radiusId.charAt(0).toUpperCase() + radiusId.slice(1)}.`,
      });
    }
  };

  const modePaletteSettings = [
    {
      mode: "light" as ThemeMode,
      title: "Light Mode Palette",
      description: "Used whenever the site is in light mode.",
      selectedPalette: lightPalette,
      setPalette: setLightPalette,
      isCollapsed: isLightPaletteCollapsed,
      toggleCollapse: () => setIsLightPaletteCollapsed(!isLightPaletteCollapsed),
    },
    {
      mode: "dark" as ThemeMode,
      title: "Dark Mode Palette",
      description: "Used whenever the site is in dark mode.",
      selectedPalette: darkPalette,
      setPalette: setDarkPalette,
      isCollapsed: isDarkPaletteCollapsed,
      toggleCollapse: () => setIsDarkPaletteCollapsed(!isDarkPaletteCollapsed),
    },
  ];

  function selectThemeMode(themeMode: ThemeMode) {
    setTheme(themeMode);
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    document.documentElement.classList.toggle("light", themeMode === "light");
    notify.info({
      title: `${themeMode === "dark" ? "Dark" : "Light"} mode on`,
      description: "Your appearance preview has been updated.",
    });
  }

  function selectPalette(mode: ThemeMode, paletteId: ColorPaletteId, paletteLabel: string) {
    if (mode === "light") setLightPalette(paletteId);
    else setDarkPalette(paletteId);

    notify.success({
      title: `${mode === "light" ? "Light" : "Dark"} palette updated`,
      description: `${paletteLabel} will be used in ${mode} mode.`,
    });
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* Left & Center Settings Panel */}
        <div className="xl:col-span-3 space-y-6">
          {/* Header Banner */}
          <div className="surface-featured p-6 sm:p-8 relative overflow-hidden rounded-3xl group">
            <div className="absolute inset-0 bg-gradient-to-r from-action/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="max-w-xl">
                <p className="flex items-center gap-2 text-[11px] font-bold text-featured-text/60 tracking-wider uppercase mb-2">
                  <span className="material-symbols-outlined text-[14px]">brush</span>
                  Theme & Customization
                </p>
                <AnimatedText
                  as="h2"
                  text="Personalize your workspace"
                  effect="micro-scale-fade"
                  className="text-2xl sm:text-3xl font-bold text-featured-text font-display mb-2 tracking-tight"
                  delayMs={70}
                />
                <p className="text-[14px] text-featured-text/70 font-medium">Assign custom color palettes, switch between light and dark visual modes, and pick your typography.</p>
              </div>
            </div>
          </div>

          {/* Mode Cards */}
          <div className="surface-card p-6 space-y-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-[14px] font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-accent">visibility</span>
                Theme Mode
              </h3>
              <p className="text-[12px] text-muted mt-1">Switch between dynamic Light or Dark mode.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { id: "light" as const, label: "Light Mode", desc: "Clean and airy", icon: "light_mode" },
                { id: "dark" as const, label: "Dark Mode", desc: "Sleek and dim", icon: "dark_mode" },
              ].map((mode) => {
                const isSelected = activeTheme === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => selectThemeMode(mode.id)}
                    className={`relative overflow-hidden p-5 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col justify-between h-[110px] active:scale-[0.98] group ${
                      isSelected
                        ? "border-accent shadow-[0_8px_30px_rgba(var(--accent-rgb),0.15)] bg-action/5"
                        : "border-card-border hover:border-accent/50 hover:bg-foreground/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`size-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${isSelected ? "bg-action text-action-text shadow-md" : "bg-foreground/[0.06] text-foreground/70 group-hover:bg-foreground/10"}`}>
                        <span className="material-symbols-outlined text-[18px]">{mode.icon}</span>
                      </span>
                      {isSelected && (
                        <span className="bg-action text-action-text text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm animate-in zoom-in">Active</span>
                      )}
                    </div>
                    
                    <div>
                      <span className="block text-[14px] font-bold text-foreground leading-tight">{mode.label}</span>
                      <span className="block text-[11px] text-muted mt-0.5">{mode.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Palette Switchers */}
          <div className="space-y-4">
            {modePaletteSettings.map((setting) => (
              <div key={setting.mode} className="surface-card p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <button
                  type="button"
                  onClick={setting.toggleCollapse}
                  className="flex items-start justify-between gap-3 w-full text-left focus:outline-none hover:opacity-80 transition-opacity group"
                >
                  <div className="pr-4">
                    <h3 className="text-[14px] font-bold text-foreground tracking-wide uppercase flex items-center gap-2 select-none transition-colors group-hover:text-action">
                      <span className="material-symbols-outlined text-[16px] text-accent">palette</span>
                      {setting.title}
                    </h3>
                    <p className="text-[12px] text-muted mt-1 leading-normal">{setting.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="rounded-full border border-card-border px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted bg-foreground/[0.02] shadow-sm">
                      {setting.mode}
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-muted transition-transform duration-300 bg-foreground/5 rounded-full p-1 group-hover:bg-action/10 group-hover:text-action" style={{ transform: setting.isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
                      keyboard_arrow_down
                    </span>
                  </div>
                </button>

                <div 
                  className={`grid transition-all duration-500 ease-in-out origin-top ${
                    setting.isCollapsed 
                      ? "grid-rows-[0fr] opacity-0 pointer-events-none mt-0" 
                      : "grid-rows-[1fr] opacity-100 mt-5"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-2 pt-1">
                      {COLOR_PALETTES.filter((palette) => setting.mode === "light" ? palette.id !== "palette-7" : palette.id !== "palette-6").map((palette) => {
                        const isSelected = setting.selectedPalette === palette.id;

                        return (
                          <button
                            key={`${setting.mode}-${palette.id}`}
                            type="button"
                            onClick={() => selectPalette(setting.mode, palette.id, palette.name)}
                            className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 flex flex-col justify-between h-[160px] active:scale-[0.96] ${
                              isSelected
                                ? "border-accent bg-action/5 shadow-[0_8px_30px_rgba(var(--accent-rgb),0.12)] ring-2 ring-accent/20"
                                : "border-card-border bg-background/40 hover:border-accent/50 hover:bg-foreground/[0.02]"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-4">
                              <div>
                                <span className="block text-[13px] font-bold text-foreground leading-tight">{palette.name}</span>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mt-1">{palette.label}</span>
                              </div>
                              <span className={`size-6 rounded-full border flex shrink-0 items-center justify-center transition-all duration-300 ${
                                isSelected
                                  ? "border-action bg-action text-action-text scale-110 shadow-md"
                                  : "border-card-border text-transparent group-hover:border-foreground/20"
                              }`}>
                                <span className="material-symbols-outlined text-[14px]">check</span>
                              </span>
                            </div>

                            <div className="flex gap-2 w-full overflow-hidden mb-3">
                              {palette.colors.map((color, colorIdx) => (
                                <span
                                  key={colorIdx}
                                  className="h-8 flex-1 rounded-lg border border-black/5 dark:border-white/5 transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-0.5"
                                  style={{ 
                                    backgroundColor: color,
                                    boxShadow: isSelected ? `0 4px 12px ${color}33` : "none"
                                  }}
                                />
                              ))}
                            </div>

                            <div className="flex flex-wrap gap-x-2 gap-y-1 text-[9px] font-mono text-muted/80 leading-none">
                              {palette.colors.map((color, idx) => (
                                <span key={idx} className="transition-colors group-hover:text-foreground">
                                  {color.replace("#", "")}
                                </span>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Typography Box */}
          <div className="surface-card p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow space-y-5">
            <div>
              <h3 className="text-[14px] font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-accent">font_download</span>
                Typography Settings
              </h3>
              <p className="text-[12px] text-muted mt-1">Customize the default platform font-family.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { id: "inter", name: "Inter", desc: "Universal, modern sans-serif", family: "'Inter', sans-serif", previewText: "Abc 123 • Pure & Universal" },
                { id: "open-sans", name: "Open Sans", desc: "Friendly and readable screen interface", family: "'Open Sans', sans-serif", previewText: "Abc 123 • Warm & Legible" },
                { id: "google-sans-flex", name: "Google Sans Flex", desc: "Premium variable geometric", family: "'Google Sans Flex', sans-serif", previewText: "Abc 123 • Sleek & Variable" },
                { id: "outfit", name: "Outfit", desc: "Elegant geometric inspired by premium branding", family: "'Outfit', sans-serif", previewText: "Abc 123 • Elegant & Brand" },
                { id: "plus-jakarta-sans", name: "Plus Jakarta Sans", desc: "Vibrant modern geometric visual feel", family: "'Plus Jakarta Sans', sans-serif", previewText: "Abc 123 • Vibrant & Modern" }
              ].map((font) => {
                const isSelected = activeFont === font.id;
                
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => handleFontChange(font.id)}
                    className={`rounded-2xl border p-5 text-left transition-all duration-300 flex flex-col justify-between h-auto gap-4 active:scale-[0.98] group ${
                      isSelected
                        ? "border-accent shadow-[0_8px_30px_rgba(var(--accent-rgb),0.12)] ring-2 ring-accent/20 bg-action/5"
                        : "border-card-border bg-background/40 hover:border-accent/50 hover:bg-foreground/[0.02]"
                    }`}
                  >
                    <div className="w-full flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block text-[14px] font-bold text-foreground tracking-tight">{font.name}</span>
                        <span className="block text-[11px] text-muted mt-1 leading-snug">{font.desc}</span>
                      </div>
                      <span className={`size-6 rounded-full border flex shrink-0 items-center justify-center transition-all duration-300 ${
                        isSelected
                          ? "border-action bg-action text-action-text scale-110 shadow-md"
                          : "border-card-border text-transparent group-hover:border-foreground/20"
                      }`}>
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </span>
                    </div>
                    
                    <div 
                      className={`w-full py-4 px-4 rounded-xl text-center text-[14px] font-bold tracking-wide transition-colors ${isSelected ? 'bg-action/10 text-action border border-action/20' : 'bg-foreground/[0.03] border border-card-border text-foreground group-hover:bg-foreground/[0.05]'}`}
                      style={{ fontFamily: font.family }}
                    >
                      {font.previewText}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Corner Style Box */}
          <div className="surface-card p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow space-y-5">
            <div>
              <h3 className="text-[14px] font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-accent">rounded_corner</span>
                Corner Style
              </h3>
              <p className="text-[12px] text-muted mt-1">Adjust the global border radius of interface elements.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { id: "squircle", name: "Squircle", desc: "Classic sharper edges", previewClass: "rounded-xl" },
                { id: "rounded", name: "Rounded", desc: "Modern softer edges", previewClass: "rounded-[2rem]" }
              ].map((radius) => {
                const isSelected = activeRadius === radius.id;
                
                return (
                  <button
                    key={radius.id}
                    type="button"
                    onClick={() => handleRadiusChange(radius.id)}
                    className={`rounded-2xl border p-5 text-left transition-all duration-300 flex flex-col justify-between h-auto gap-4 active:scale-[0.98] group ${
                      isSelected
                        ? "border-accent shadow-[0_8px_30px_rgba(var(--accent-rgb),0.12)] ring-2 ring-accent/20 bg-action/5"
                        : "border-card-border bg-background/40 hover:border-accent/50 hover:bg-foreground/[0.02]"
                    }`}
                  >
                    <div className="w-full flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block text-[14px] font-bold text-foreground tracking-tight">{radius.name}</span>
                        <span className="block text-[11px] text-muted mt-1 leading-snug">{radius.desc}</span>
                      </div>
                      <span className={`size-6 rounded-full border flex shrink-0 items-center justify-center transition-all duration-300 ${
                        isSelected
                          ? "border-action bg-action text-action-text scale-110 shadow-md"
                          : "border-card-border text-transparent group-hover:border-foreground/20"
                      }`}>
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </span>
                    </div>
                    
                    <div className="w-full py-4 px-4 flex justify-center items-center h-20 bg-foreground/[0.03] border border-card-border group-hover:bg-foreground/[0.05] rounded-lg">
                       <div className="w-24 h-12 bg-action/20 border-2 border-action transition-all duration-300" style={{ borderRadius: radius.id === "squircle" ? "8px" : "32px" }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive UI Preview Playground */}
        <div className="xl:col-span-2">
          <div className="surface-card p-6 border border-card-border rounded-3xl relative overflow-hidden backdrop-blur-xl shadow-2xl xl:sticky xl:top-24 bg-gradient-to-br from-background to-foreground/[0.02]">

            <div className="border-b border-card-border/60 pb-4 mb-5 flex justify-center text-center">
              <h4 className="text-[13px] font-bold text-foreground tracking-wider uppercase flex items-center justify-center gap-2 w-full">
                <span className="material-symbols-outlined text-[18px] text-accent animate-pulse">desktop_windows</span>
                Live UI Playground
              </h4>
            </div>

            {/* Simulated Web Application Screen */}
            <div 
              className="bg-background border border-card-border rounded-2xl shadow-2xl transition-all duration-500 relative overflow-hidden hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] hover:-translate-y-1 ring-1 ring-white/10"
              style={{ 
                fontFamily: activeFont === 'inter' 
                  ? 'Inter, sans-serif' 
                  : activeFont === 'outfit' 
                    ? 'Outfit, sans-serif' 
                    : activeFont === 'plus-jakarta-sans' 
                      ? 'Plus Jakarta Sans, sans-serif' 
                      : activeFont === 'open-sans' 
                        ? 'Open Sans, sans-serif' 
                        : 'Google Sans Flex, sans-serif',
                minHeight: "320px"
              }}
            >

              {/* Desktop App Mockup Layout */}
              <div className="flex flex-col h-[280px] text-[12px] overflow-hidden bg-background">
                {/* Desktop Top Header Bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-card-border bg-foreground/[0.01] shrink-0 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span className="size-7 rounded-xl bg-action/15 text-action flex items-center justify-center font-bold text-[13px] shadow-sm">B</span>
                    <div className="flex items-center gap-2.5 text-[11px] font-bold text-muted tracking-wide">
                      <span className="text-action">Invoices</span>
                      <span className="opacity-40">•</span>
                      <span className="hover:text-foreground transition-colors cursor-pointer">Clients</span>
                    </div>
                  </div>
                  <span className="size-6 rounded-full bg-foreground/10 flex items-center justify-center"><span className="material-symbols-outlined text-[14px] text-foreground">person</span></span>
                </div>

                {/* Desktop Main Content */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h5 className="text-[14px] font-bold text-foreground tracking-tight leading-tight">Invoices</h5>
                      <span className="text-[9px] text-muted tracking-wider font-bold block uppercase mt-0.5">Active Profile</span>
                    </div>
                    <button type="button" className="btn-primary min-h-[26px] px-3 rounded-lg py-1 text-[10px] font-bold shadow-md cursor-default pointer-events-none flex items-center gap-1.5 shrink-0 transform hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[13px]">add</span>
                      Create
                    </button>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-card-border bg-foreground/[0.02] shadow-sm hover:bg-foreground/[0.04] transition-colors relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-3xl">trending_up</span>
                      </div>
                      <span className="text-[8.5px] font-bold text-muted uppercase tracking-widest block leading-none mb-1.5">Billed</span>
                      <div className="text-[15px] font-black text-foreground leading-none">$14.2k</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-card-border bg-foreground/[0.02] shadow-sm hover:bg-foreground/[0.04] transition-colors relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-3xl">schedule</span>
                      </div>
                      <span className="text-[8.5px] font-bold text-muted uppercase tracking-widest block leading-none mb-1.5">Pending</span>
                      <div className="text-[15px] font-black text-foreground leading-none">$3.2k</div>
                    </div>
                  </div>

                  {/* Mini Invoices List */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[8.5px] font-bold text-muted uppercase tracking-wider border-b border-card-border pb-1.5 px-1">
                      <span>Client</span>
                      <span className="text-right">Amount</span>
                      <span className="text-right">Status</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] p-2 hover:bg-foreground/[0.03] rounded-lg transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[10px]">A</div>
                        <span className="font-bold text-foreground truncate max-w-[80px]">Acme Corp</span>
                      </div>
                      <span className="font-bold text-foreground">$1.5k</span>
                      <span className="px-2 py-1 rounded-md bg-[var(--positive-soft)] text-[8.5px] font-bold text-positive tracking-wider uppercase border border-positive/20 leading-none shadow-sm">
                        Paid
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-[11px] p-2 hover:bg-foreground/[0.03] rounded-lg transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-[10px]">S</div>
                        <span className="font-bold text-foreground truncate max-w-[80px]">Stark Labs</span>
                      </div>
                      <span className="font-bold text-foreground">$2.8k</span>
                      <span className="px-2 py-1 rounded-md bg-action/15 text-[8.5px] font-bold text-action tracking-wider uppercase border border-action/20 leading-none shadow-sm">
                        Sent
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="mt-5 bg-foreground/[0.03] border border-card-border rounded-xl p-4 flex gap-3 items-start text-[11px] text-muted shadow-inner">
              <span className="material-symbols-outlined text-[20px] text-accent shrink-0">info</span>
              <p className="leading-relaxed font-medium">
                This canvas updates dynamically in real-time. Customize theme color styles or typography fonts on the left to preview how your invoice app will look.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
