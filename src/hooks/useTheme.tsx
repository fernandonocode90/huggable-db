import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeMode = "night" | "day";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "swc-theme";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "night";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "day" || saved === "night") return saved;
  return "night";
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-day", theme === "day");
    root.classList.toggle("theme-night", theme === "night");
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (t: ThemeMode) => setThemeState(t);
  const toggleTheme = () => setThemeState((p) => (p === "night" ? "day" : "night"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
