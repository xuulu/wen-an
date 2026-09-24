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
  const [theme, setThemeState] = useState<ThemeName>(initialTheme);
  const [systemDark, setSystemDark] = useState(false);

  // 系统偏好监听：跟随系统模式下实时响应
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // 初始化同步：cookie → localStorage（与内联防 FOUC 脚本同源），
  // 保证 Provider 状态与首帧 DOM 一致（cookie 有效时 SSR 已正确，无需改动）
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = document.cookie.match(/(?:^|; )wenan-theme=([^;]*)/)?.[1] ?? null;
    } catch {}
    if (!stored) {
      try {
        stored = localStorage.getItem(THEME_STORAGE_KEY);
      } catch {}
    }
    if (isThemeName(stored) && stored !== "system") {
      setThemeState(stored);
    }
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
