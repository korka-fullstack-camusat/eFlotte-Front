import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "parccam_theme_color";
const DEFAULT_COLOR = "#003c71";

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyColor(hex: string) {
  document.documentElement.style.setProperty("--camublue-900", hexToHsl(hex));
}

type ThemeContextValue = {
  color: string;
  setColor: (hex: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [color, setColorState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_COLOR;
  });

  useEffect(() => {
    applyColor(color);
  }, [color]);

  const setColor = (hex: string) => {
    setColorState(hex);
    localStorage.setItem(STORAGE_KEY, hex);
  };

  return (
    <ThemeContext.Provider value={{ color, setColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
