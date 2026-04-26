import { useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Languages, SlidersHorizontal, X } from "lucide-react";
import { useLanguage } from "@/context/language";
import { useBrightness } from "@/context/brightness";
import { Slider } from "@/components/ui/slider";

export function FloatingControls() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { brightness, setBrightness } = useBrightness();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-3 bottom-3 sm:right-5 sm:bottom-5 z-[9999] flex flex-col items-end gap-2">
      {open && (
        <div className="rounded-xl bg-popover text-popover-foreground border border-border shadow-2xl p-3 w-60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("controlsTitle")}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-muted"
              aria-label="close"
              data-testid="button-close-controls"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            className="w-full flex items-center justify-between rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-bold hover:opacity-90"
            data-testid="button-floating-lang"
          >
            <span className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              {t("languageLabel")}
            </span>
            <span>{lang === "es" ? "🇦🇷 ES → 🇬🇧 EN" : "🇬🇧 EN → 🇦🇷 ES"}</span>
          </button>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            data-testid="button-floating-theme"
          >
            <span className="flex items-center gap-2">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? t("lightMode") : t("darkMode")}
            </span>
          </button>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{t("brightness")}</span>
              <span className="text-muted-foreground tabular-nums" data-testid="text-brightness-value">{brightness}%</span>
            </div>
            <Slider
              min={30}
              max={100}
              step={5}
              value={[brightness]}
              onValueChange={(v) => setBrightness(v[0] ?? 100)}
              data-testid="slider-brightness"
            />
            <p className="text-[10px] text-muted-foreground leading-tight">{t("brightnessHint")}</p>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg px-4 py-2.5 text-sm font-bold hover:opacity-90"
        data-testid="button-floating-toggle"
        title={t("controlsTitle")}
      >
        {open ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
        <span className="hidden sm:inline">{lang === "es" ? "ES" : "EN"}</span>
      </button>
    </div>
  );
}
