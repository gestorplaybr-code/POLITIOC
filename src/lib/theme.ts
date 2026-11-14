import { useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark";
const KEY = "vf-theme";

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", t === "dark");
  root.classList.toggle("light", t === "light");
}

function readStored(): Theme | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : null;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => readStored() ?? "dark");
  const [isFirstTime, setIsFirstTime] = useState<boolean>(() => readStored() == null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch {}
    setIsFirstTime(false);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle, isFirstTime };
}