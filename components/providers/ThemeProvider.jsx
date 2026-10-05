"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME, THEME_KEY, applyTheme, readStoredTheme, resolveTheme } from "@/lib/theme";

const ThemeContext = createContext({ theme: DEFAULT_THEME, resolved: "light", setTheme: () => {} });

/**
 * theme = انتخاب کاربر ("system" | "light" | "dark")،  resolved = چیزی که واقعاً نمایش داده می‌شه ("light" | "dark").
 * تا وقتی روی «سیستم» هست، با عوض‌شدن تم دستگاه، سایت هم هم‌زمان عوض می‌شه.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [resolved, setResolved] = useState("light");

  // بعد از mount مقدار ذخیره‌شده رو بخون (روی سرور localStorage نداریم)
  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    setResolved(resolveTheme(stored));
  }, []);

  // «سیستم»: به تغییر تم دستگاه گوش بده
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(applyTheme("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  // هماهنگی بین تب‌ها
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== THEME_KEY) return;
      const next = readStoredTheme();
      setThemeState(next);
      setResolved(applyTheme(next));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next) => {
    try {
      if (next === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {}
    setThemeState(next);
    setResolved(applyTheme(next));
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
