"use client";

/**
 * SHAURI Theme System
 *
 * Two art-directed themes:
 *   "dawn"  — warm cream + gold + navy accents (DEFAULT)
 *   "night" — deep navy + muted gold + cream text (focused study)
 *
 * Architecture:
 *   · Applies data-theme="night" to <html> element
 *   · CSS vars in globals.css respond to [data-theme="night"]
 *   · Persists to localStorage under key "shauri_theme"
 *   · Reads system prefers-color-scheme as first-run default
 *   · No flash: initial script injected before paint (see layout.tsx)
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────
export type SHAURITheme = "dawn" | "night";

interface ThemeContextValue {
  theme: SHAURITheme;
  setTheme: (t: SHAURITheme) => void;
  toggle: () => void;
  isDawn: boolean;
  isNight: boolean;
}

// ─── Context ──────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextValue>({
  theme:    "dawn",
  setTheme: () => {},
  toggle:   () => {},
  isDawn:   true,
  isNight:  false,
});

// ─── Provider ─────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<SHAURITheme>("dawn");

  // applyTheme must be defined before useEffect and useCallback that reference it
  const applyTheme = (t: SHAURITheme) => {
    const html = document.documentElement;
    if (t === "night") {
      html.setAttribute("data-theme", "night");
    } else {
      html.removeAttribute("data-theme");
    }
  };

  // Read persisted or system preference on mount
  useEffect(() => {
    let saved = localStorage.getItem("shauri_theme") as SHAURITheme | null;
    if (!saved) {
      saved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "night"
        : "dawn";
    }
    applyTheme(saved);
    setThemeState(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((t: SHAURITheme) => {
    applyTheme(t);
    setThemeState(t);
    localStorage.setItem("shauri_theme", t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dawn" ? "night" : "dawn");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggle,
      isDawn:  theme === "dawn",
      isNight: theme === "night",
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// ─── Anti-flash script (inject into <head> via layout.tsx) ────
// This runs before React hydrates, applying the saved theme
// immediately so there's no cream→dark flash on reload.
export const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem("shauri_theme");
    if (!saved) {
      saved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "dawn";
    }
    if (saved === "night") document.documentElement.setAttribute("data-theme", "night");
  } catch(e) {}
})();
`.trim();