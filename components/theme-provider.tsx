"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  isThemeName,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEME_STORAGE_KEY,
  type ThemeName,
} from "@/lib/theme";

interface ThemeContextValue {
  /** 当前选择（含 system） */
  theme: ThemeName;
  /** 实际生效主题（system 解析后的 light/dark/neon） */
  resolved: "light" | "dark" | "neon";
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** 把主题落到 <html>（class + data-theme + color-scheme），与内联脚本逻辑一致 */
function applyTheme(theme: ThemeName) {
  const doc = document.documentElement;
  if (theme === "system") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    doc.setAttribute("data-theme", dark ? "dark" : "light");
    doc.classList.toggle("dark", dark);
    doc.style.colorScheme = dark ? "dark" : "light";
  } else {
    doc.setAttribute("data-theme", theme);
    doc.classList.toggle("dark", theme === "dark");
    doc.style.colorScheme = theme === "dark" || theme === "neon" ? "dark" : "light";
  }
}

function resolveSystem(dark: boolean): "light" | "dark" {
  return dark ? "dark" : "light";
}

export function ThemeProvider({
  children,
  initialTheme = "system",
}: {
  children: React.ReactNode;
  initialTheme?: ThemeName;
}) {
  // 惰性初始化：读持久化值（localStorage 优先，保留 "system"），
  // 否则读首帧内联脚本已设置到 <html> 的主题；SSR 阶段用服务端 cookie 解析值
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return initialTheme;
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemeName(stored)) return stored;
    } catch {}
    const domTheme = document.documentElement.dataset.theme;
    return isThemeName(domTheme) ? domTheme : initialTheme;
  });
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // 系统偏好监听：跟随系统模式下实时响应
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // 生效主题
  const resolved: "light" | "dark" | "neon" =
    theme === "system" ? resolveSystem(systemDark) : theme;

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
    try {
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme 必须在 ThemeProvider 内使用");
  return ctx;
}
