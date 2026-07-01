import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { COLOR_PALETTES, type ColorPaletteId, useModePalettes } from "@/hooks/use-mode-palettes";
import { ensureFontLoaded, type FontId } from "@/lib/font-loader";
import { notify } from "@/lib/toast";
import { AnimatedText } from "@/components/animated-text";
import { 
  Paintbrush, 
  Eye, 
  Sun, 
  Moon, 
  Palette, 
  ChevronDown, 
  Check, 
  Type, 
  Monitor, 
  Plus, 
  TrendingUp, 
  Clock, 
  Info, 
  User, 
  LayoutGrid, 
  Maximize2, 
  Sliders,
  TrendingDown,
  Percent
} from "lucide-react";

type ThemeMode = "light" | "dark" | "system";

export function AppearanceTab() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { lightPalette, darkPalette, setLightPalette, setDarkPalette } = useModePalettes();
  
  const activeTheme = resolvedTheme === "dark" ? "dark" : "light";
  const [activeFont, setActiveFont] = useState<string>("inter");
  const [activeRadius, setActiveRadius] = useState<string>("rounded");
  const [activeDensity, setActiveDensity] = useState<string>("standard");
  const [fontPreviewText, setFontPreviewText] = useState<string>("");
  
  const [isLightPaletteCollapsed, setIsLightPaletteCollapsed] = useState(false);
  const [isDarkPaletteCollapsed, setIsDarkPaletteCollapsed] = useState(false);
  
  // Simulated mockup screen active tab state
  const [mockTab, setMockTab] = useState<"overview" | "invoices" | "analytics">("overview");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedFont = window.localStorage.getItem("billcraft.font.v1");
      if (storedFont) {
        setActiveFont(storedFont);
        ensureFontLoaded(storedFont as FontId);
      }

      const storedRadius = window.localStorage.getItem("billcraft.radius.v1");
      if (storedRadius) setActiveRadius(storedRadius);

      const storedDensity = window.localStorage.getItem("billcraft.density.v1");
      if (storedDensity) setActiveDensity(storedDensity);

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
      document.documentElement.dataset.font = fontId;
      ensureFontLoaded(fontId as FontId);
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
      document.documentElement.dataset.radius = radiusId;
      notify.success({
        title: "Corner style updated",
        description: `Corner style set to ${radiusId.charAt(0).toUpperCase() + radiusId.slice(1)}.`,
      });
    }
  };

  const handleDensityChange = (density: string) => {
    setActiveDensity(density);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("billcraft.density.v1", density);
      document.documentElement.dataset.density = density;
      notify.success({
        title: "Density updated",
        description: `Layout set to ${density.charAt(0).toUpperCase() + density.slice(1)} density.`,
      });
    }
  };

  const modePaletteSettings = [
    {
      mode: "light" as const,
      title: "Light Mode Palette",
      description: "Used whenever the site is in light mode.",
      selectedPalette: lightPalette,
      setPalette: setLightPalette,
      isCollapsed: isLightPaletteCollapsed,
      toggleCollapse: () => setIsLightPaletteCollapsed(!isLightPaletteCollapsed),
    },
    {
      mode: "dark" as const,
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
    
    // next-theme resolvedTheme handles document classes but we force sync bootstrap class here
    const isDark = themeMode === "system" 
      ? window.matchMedia("(prefers-color-scheme: dark)").matches 
      : themeMode === "dark";
      
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    
    notify.info({
      title: `${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)} mode active`,
      description: "Your appearance preview has been updated.",
    });
  }

  function selectPalette(mode: "light" | "dark", paletteId: ColorPaletteId, paletteLabel: string) {
    if (mode === "light") setLightPalette(paletteId);
    else setDarkPalette(paletteId);


    notify.success({
      title: `${mode === "light" ? "Light" : "Dark"} palette updated`,
      description: `${paletteLabel} will be used in ${mode} mode.`,
    });
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="space-y-6">
          
          {/* Header Banner */}
          <div className="surface-featured p-6 sm:p-8 relative overflow-hidden rounded-xl group border border-card-border/50">
            <div className="absolute inset-0 bg-gradient-to-r from-action/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="max-w-xl">
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-featured-text/50 tracking-wider uppercase mb-1.5">
                  Appearance Preferences
                </p>
                <AnimatedText
                  as="h2"
                  text="Customize Workspace Layout"
                  effect="micro-scale-fade"
                  className="text-2xl sm:text-3xl font-bold text-featured-text font-display mb-2 tracking-tight"
                  delayMs={70}
                />
                <p className="text-[13px] text-featured-text/60 font-medium">
                  Assign dynamic color accents, modify typography preview fonts, set display spacing density, or switch window theme modes.
                </p>
              </div>
            </div>
          </div>

          {/* Theme Mode */}
          <div className="surface-card p-5 rounded-xl border border-card-border/60 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                Theme Mode
              </h3>
              <p className="text-[11px] text-muted mt-0.5">Switch between dynamic Light, Dark, or System configurations.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "light" as const, label: "Light Mode", desc: "Clean & Airy", icon: Sun },
                { id: "dark" as const, label: "Dark Mode", desc: "Sleek & Deep", icon: Moon },
                { id: "system" as const, label: "System Sync", desc: "Automatic", icon: Monitor },
              ].map((mode) => {
                const isSelected = theme === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => selectThemeMode(mode.id)}
                    className={`relative overflow-hidden p-4 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-[105px] active:scale-[0.98] group cursor-pointer ${
                      isSelected
                        ? "border-accent bg-accent/5 shadow-xs shadow-accent/5"
                        : "border-card-border bg-background/20 hover:border-accent/40 hover:bg-foreground/[0.01]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`size-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${isSelected ? "bg-accent/15 text-accent shadow-sm" : "bg-foreground/[0.04] text-foreground/70 group-hover:bg-foreground/10"}`}>
                        <mode.icon className="size-4.5" />
                      </span>
                      {isSelected && (
                        <span className="bg-accent text-action-text text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-xs animate-in zoom-in">Active</span>
                      )}
                    </div>
                    
                    <div>
                      <span className="block text-[12px] font-bold text-foreground leading-tight">{mode.label}</span>
                      <span className="block text-[10px] text-muted mt-0.5">{mode.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>


          {/* Layout Spacing Density */}
          <div className="surface-card p-5 rounded-xl border border-card-border/60 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                Layout Spacing Density
              </h3>
              <p className="text-[11px] text-muted mt-0.5">Customize visual layouts, paddings, and component gap spacings.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "compact", label: "Compact", desc: "Tighter rows & borders", density: "0.5rem spacing" },
                { id: "standard", label: "Standard", desc: "Cohesive default grid", density: "Default 10px spacing" },
                { id: "spacious", label: "Spacious", desc: "Airy breathing room", density: "Expanded margins" },
              ].map((item) => {
                const isSelected = activeDensity === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleDensityChange(item.id)}
                    className={`relative p-4 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-[95px] active:scale-[0.98] group cursor-pointer ${
                      isSelected
                        ? "border-accent bg-accent/5"
                        : "border-card-border bg-background/20 hover:border-accent/40 hover:bg-foreground/[0.01]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[12px] font-bold text-foreground">{item.label}</span>
                      {isSelected && (
                        <Check className="size-4 text-accent" />
                      )}
                    </div>
                    
                    <div>
                      <span className="block text-[10px] text-muted leading-tight">{item.desc}</span>
                      <span className="block text-[9px] text-muted/50 mt-0.5 leading-none">{item.density}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Palette Preset Switchers */}
          <div className="space-y-4">
            {modePaletteSettings.map((setting) => (
              <div key={setting.mode} className="surface-card p-5 rounded-xl border border-card-border/60 shadow-sm">
                <button
                  type="button"
                  onClick={setting.toggleCollapse}
                  className="flex items-start justify-between gap-3 w-full text-left focus:outline-none hover:opacity-85 transition-opacity group cursor-pointer"
                >
                  <div className="pr-4">
                    <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2 transition-colors group-hover:text-accent">
                      {setting.title}
                    </h3>
                    <p className="text-[11px] text-muted mt-0.5 leading-normal">{setting.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="rounded-md border border-card-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted bg-foreground/[0.02] shadow-xs">
                      {setting.mode}
                    </span>
                    <ChevronDown className="size-5 text-muted transition-transform duration-300 bg-foreground/5 rounded-full p-1 group-hover:bg-accent/10 group-hover:text-accent" style={{ transform: setting.isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }} />
                  </div>
                </button>

                <div 
                  className={`grid transition-all duration-500 ease-in-out origin-top ${
                    setting.isCollapsed 
                      ? "grid-rows-[0fr] opacity-0 pointer-events-none mt-0" 
                      : "grid-rows-[1fr] opacity-100 mt-4"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pb-2 pt-1">
                      {COLOR_PALETTES.filter((palette) => setting.mode === "light" ? palette.id !== "palette-7" : palette.id !== "palette-6").map((palette) => {
                        const isSelected = setting.selectedPalette === palette.id;

                        return (
                          <button
                            key={`${setting.mode}-${palette.id}`}
                            type="button"
                            onClick={() => selectPalette(setting.mode, palette.id, palette.name)}
                            className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 flex flex-col justify-between h-[150px] active:scale-[0.96] cursor-pointer ${
                              isSelected
                                ? "border-accent bg-action/5 shadow-[0_8px_30px_rgba(var(--accent-rgb),0.12)] ring-2 ring-accent/20"
                                : "border-card-border bg-background/20 hover:border-accent/50 hover:bg-foreground/[0.01]"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-3">
                              <div className="min-w-0">
                                <span className="block text-[12px] font-bold text-foreground leading-tight truncate">{palette.name}</span>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-muted mt-0.5">{palette.label}</span>
                              </div>
                              <span className={`size-5 rounded-full border flex shrink-0 items-center justify-center transition-all duration-300 ${
                                isSelected
                                  ? "border-action bg-action text-action-text scale-110 shadow-xs"
                                  : "border-card-border text-transparent group-hover:border-foreground/20"
                              }`}>
                                <Check className="size-3" />
                              </span>
                            </div>

                            <div className="flex gap-1.5 w-full overflow-hidden mb-2.5">
                              {palette.colors.map((color, colorIdx) => (
                                <span
                                  key={colorIdx}
                                  className="h-7 flex-1 rounded-md border border-black/5 dark:border-white/5 transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-0.5"
                                  style={{ 
                                    backgroundColor: color,
                                    boxShadow: isSelected ? `0 4px 10px ${color}25` : "none"
                                  }}
                                />
                              ))}
                            </div>

                            <div className="flex flex-wrap gap-x-2 gap-y-1 text-[8.5px] font-mono text-muted/70 leading-none">
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
          <div className="surface-card p-5 rounded-xl border border-card-border/60 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
                Typography Settings
              </h3>
              <p className="text-[11px] text-muted mt-0.5">Customize the default font-family in use across the workspace.</p>
            </div>

            {/* Font Preview Input Sandbox */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-muted uppercase tracking-wider">Typography Sandbox Input</label>
              <input
                type="text"
                value={fontPreviewText}
                onChange={(e) => setFontPreviewText(e.target.value)}
                className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                placeholder="Type custom preview text here... (e.g. BillCraft invoices)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { id: "inter", name: "Inter", desc: "Universal, modern sans-serif", family: "'Inter', sans-serif", previewText: "Abc 123 • Pure & Universal" },
                { id: "open-sans", name: "Open Sans", desc: "Friendly and highly readable screen feel", family: "'Open Sans', sans-serif", previewText: "Abc 123 • Warm & Legible" },
                { id: "google-sans-flex", name: "Google Sans Flex", desc: "Premium variable geometric sans", family: "'Google Sans Flex', sans-serif", previewText: "Abc 123 • Sleek & Variable" },
                { id: "outfit", name: "Outfit", desc: "Elegant geometric branding curves", family: "'Outfit', sans-serif", previewText: "Abc 123 • Elegant & Brand" },
                { id: "plus-jakarta-sans", name: "Plus Jakarta Sans", desc: "Vibrant energetic geometry", family: "'Plus Jakarta Sans', sans-serif", previewText: "Abc 123 • Vibrant & Modern" }
              ].map((font) => {
                const isSelected = activeFont === font.id;
                
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => handleFontChange(font.id)}
                    className={`rounded-xl border p-4 text-left transition-all duration-300 flex flex-col justify-between h-auto gap-3.5 active:scale-[0.98] group cursor-pointer ${
                      isSelected
                        ? "border-accent shadow-[0_8px_30px_rgba(var(--accent-rgb),0.12)] ring-2 ring-accent/20 bg-accent/5"
                        : "border-card-border bg-background/20 hover:border-accent/50 hover:bg-foreground/[0.01]"
                    }`}
                  >
                    <div className="w-full flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block text-[13px] font-bold text-foreground tracking-tight truncate">{font.name}</span>
                        <span className="block text-[10px] text-muted mt-0.5 leading-snug">{font.desc}</span>
                      </div>
                      <span className={`size-5.5 rounded-full border flex shrink-0 items-center justify-center transition-all duration-300 ${
                        isSelected
                          ? "border-accent bg-accent text-action-text scale-110 shadow-xs"
                          : "border-card-border text-transparent group-hover:border-foreground/20"
                      }`}>
                        <Check className="size-3" />
                      </span>
                    </div>
                    
                    <div 
                      className={`w-full py-3 px-3 rounded-lg text-center text-[12.5px] font-bold tracking-wide transition-colors ${isSelected ? 'bg-accent/10 text-accent border border-accent/15' : 'bg-foreground/[0.02] border border-card-border text-foreground group-hover:bg-foreground/[0.04]'}`}
                      style={{ fontFamily: font.family }}
                    >
                      {fontPreviewText || font.previewText}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>      </div>
    </div>
  );
}
