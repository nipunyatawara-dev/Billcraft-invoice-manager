"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { AnimatedText } from "@/components/animated-text";
import { useAstryxAppearance } from "@/hooks/use-astryx-appearance";
import { ASTRYX_THEME_IDS, ASTRYX_THEMES, type AstryxColorMode, type AstryxThemeId } from "@/lib/astryx-themes";
import { notify } from "@/lib/toast";

export function AppearanceTab() {
  const { themeId, setThemeId, mode, setMode, darkOnly } = useAstryxAppearance();

  function selectThemeMode(themeMode: AstryxColorMode) {
    if (darkOnly && themeMode !== "dark") {
      notify.info({
        title: "Gothic is dark-only",
        description: "Switch to another theme to use light or system mode.",
      });
      return;
    }

    setMode(themeMode);
    notify.info({
      title: `${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)} mode active`,
      description: "Your appearance preview has been updated.",
    });
  }

  function selectTheme(nextId: AstryxThemeId) {
    setThemeId(nextId);
    const meta = ASTRYX_THEMES[nextId];
    if (meta.darkOnly) {
      setMode("dark");
    }
    notify.success({
      title: `${meta.label} theme active`,
      description: meta.description,
    });
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="surface-featured p-6 sm:p-8 relative overflow-hidden rounded-xl group border border-card-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-action/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="max-w-xl">
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-featured-text/50 tracking-wider uppercase mb-1.5">
                Appearance Preferences
              </p>
              <AnimatedText
                as="h2"
                text="Astryx Themes"
                effect="micro-scale-fade"
                className="text-2xl sm:text-3xl font-bold text-featured-text font-display mb-2 tracking-tight"
                delayMs={70}
              />
              <p className="text-[13px] text-featured-text/60 font-medium">
                Pick an official Astryx theme and light/dark mode. Themes replace the old BillCraft color palettes.
              </p>
            </div>
          </div>
        </div>

        <div className="surface-card p-5 rounded-xl border border-card-border/60 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
              Color Mode
            </h3>
            <p className="text-[11px] text-muted mt-0.5">
              {darkOnly
                ? "Gothic forces dark mode. Choose another theme to unlock light or system."
                : "Switch between Light, Dark, or System."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { id: "light" as const, label: "Light Mode", desc: "Clean & Airy", icon: Sun },
                { id: "dark" as const, label: "Dark Mode", desc: "Sleek & Deep", icon: Moon },
                { id: "system" as const, label: "System Sync", desc: "Automatic", icon: Monitor },
              ] as const
            ).map((item) => {
              const isSelected = mode === item.id;
              const isDisabled = darkOnly && item.id !== "dark";
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectThemeMode(item.id)}
                  className={`relative overflow-hidden p-4 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-[105px] active:scale-[0.98] group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSelected
                      ? "border-accent bg-accent/5 shadow-xs shadow-accent/5"
                      : "border-card-border bg-background/20 hover:border-accent/40 hover:bg-foreground/[0.01]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`size-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                        isSelected
                          ? "bg-accent/15 text-accent shadow-sm"
                          : "bg-foreground/[0.04] text-foreground/70 group-hover:bg-foreground/10"
                      }`}
                    >
                      <item.icon className="size-4.5" />
                    </span>
                    {isSelected && (
                      <span className="bg-accent text-action-text text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-xs animate-in zoom-in">
                        Active
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[12px] font-bold text-foreground leading-tight">{item.label}</span>
                    <span className="block text-[10px] text-muted mt-0.5">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="surface-card p-5 rounded-xl border border-card-border/60 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
              Theme
            </h3>
            <p className="text-[11px] text-muted mt-0.5">
              Official Astryx themes — Neutral, Butter, Chocolate, Matcha, Stone, Gothic, and Y2K.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {ASTRYX_THEME_IDS.map((id) => {
              const theme = ASTRYX_THEMES[id];
              const isSelected = themeId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectTheme(id)}
                  className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 flex flex-col justify-between h-[150px] active:scale-[0.96] cursor-pointer ${
                    isSelected
                      ? "border-accent bg-action/5 ring-2 ring-accent/20"
                      : "border-card-border bg-background/20 hover:border-accent/50 hover:bg-foreground/[0.01]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="min-w-0">
                      <span className="block text-[12px] font-bold text-foreground leading-tight truncate">
                        {theme.label}
                      </span>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-muted mt-0.5">
                        {theme.darkOnly ? "Dark only" : "Light & dark"}
                      </span>
                    </div>
                    <span
                      className={`size-5 rounded-full border flex shrink-0 items-center justify-center transition-all duration-300 ${
                        isSelected
                          ? "border-action bg-action text-action-text scale-110 shadow-xs"
                          : "border-card-border text-transparent group-hover:border-foreground/20"
                      }`}
                    >
                      <Check className="size-3" />
                    </span>
                  </div>

                  <div className="flex gap-1.5 w-full overflow-hidden mb-2.5">
                    {theme.preview.map((color, colorIdx) => (
                      <span
                        key={colorIdx}
                        className="h-7 flex-1 rounded-md border border-black/5 dark:border-white/5 transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-0.5"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <p className="text-[10px] text-muted leading-snug">{theme.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
