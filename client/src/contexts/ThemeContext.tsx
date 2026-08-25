import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "emerald" | "midnight" | "daylight";

export const PIXBEE_THEMES: Array<{ id: Theme; label: string; description: string }> = [
  {
    id: "emerald",
    label: "Esmeralda",
    description: "Verde operacional com acentos turquesa.",
  },
  {
    id: "midnight",
    label: "Índigo noturno",
    description: "Azul profundo com violeta de alta concentração.",
  },
  {
    id: "daylight",
    label: "Brisa clara",
    description: "Fundo claro, azul-marinho e detalhes em coral.",
  },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "emerald",
  switchable = true,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const previewTheme = new URLSearchParams(window.location.search).get("theme");
    if (PIXBEE_THEMES.some(item => item.id === previewTheme)) {
      return previewTheme as Theme;
    }
    const stored = localStorage.getItem("pixbee-theme");
    if (stored === "copper") return "daylight";
    return PIXBEE_THEMES.some(item => item.id === stored)
      ? (stored as Theme)
      : defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.pixbeeTheme = theme;

    if (switchable) {
      localStorage.setItem("pixbee-theme", theme);
    }
  }, [theme, switchable]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
