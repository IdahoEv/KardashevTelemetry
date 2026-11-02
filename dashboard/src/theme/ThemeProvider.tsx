import { useEffect, useState, type ReactNode } from "react";
import { THEME_MODES, ThemeContext, type ThemeMode } from "./themeContext";

const STORAGE_KEY = "kardashev-theme";

function loadMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY);
  return THEME_MODES.find((mode) => mode === saved) ?? "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(loadMode);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return <ThemeContext value={{ mode, setMode }}>{children}</ThemeContext>;
}
