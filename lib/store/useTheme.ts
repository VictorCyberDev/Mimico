"use client";

import { useEffect } from "react";
import { useAssistant } from "./assistantStore";

/**
 * §4 — prefers-color-scheme supplies the default, a session-only override in
 * the store wins over it. Nothing is written to localStorage on purpose.
 */
export function useTheme() {
  const theme = useAssistant((s) => s.theme);
  const setTheme = useAssistant((s) => s.setTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme) {
      root.classList.toggle("theme-dark", theme === "dark");
      root.classList.toggle("theme-light", theme === "light");
      return;
    }
    // No override yet: follow the OS, and keep following it while it changes.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.classList.toggle("theme-dark", mq.matches);
      root.classList.toggle("theme-light", !mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  const resolved: "light" | "dark" =
    theme ??
    (typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");

  return { theme: resolved, setTheme, toggle: () => setTheme(resolved === "dark" ? "light" : "dark") };
}
