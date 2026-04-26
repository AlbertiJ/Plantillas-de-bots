import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface BrightnessContextType {
  brightness: number;
  setBrightness: (n: number) => void;
}

const BrightnessContext = createContext<BrightnessContextType>({
  brightness: 100,
  setBrightness: () => {},
});

const STORAGE_KEY = "ptb-brightness";

export function BrightnessProvider({ children }: { children: ReactNode }) {
  const [brightness, setBrightnessState] = useState<number>(() => {
    if (typeof window === "undefined") return 100;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const n = raw ? Number(raw) : 100;
    return Number.isFinite(n) && n >= 30 && n <= 100 ? n : 100;
  });

  const setBrightness = (n: number) => {
    const clamped = Math.max(30, Math.min(100, Math.round(n)));
    setBrightnessState(clamped);
    window.localStorage.setItem(STORAGE_KEY, String(clamped));
  };

  return (
    <BrightnessContext.Provider value={{ brightness, setBrightness }}>
      {children}
      <BrightnessOverlay brightness={brightness} />
    </BrightnessContext.Provider>
  );
}

function BrightnessOverlay({ brightness }: { brightness: number }) {
  const opacity = (100 - brightness) / 100;
  useEffect(() => {
    document.documentElement.style.setProperty("--ptb-dim", String(opacity));
  }, [opacity]);
  if (opacity <= 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9998] bg-black"
      style={{ opacity }}
    />
  );
}

export function useBrightness() {
  return useContext(BrightnessContext);
}
