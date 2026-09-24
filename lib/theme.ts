/** 全站主题：浅色 / 深色 / 跟随系统 / 霓虹彩蛋 */
export type ThemeName = "light" | "dark" | "system" | "neon";

export const THEMES: ThemeName[] = ["light", "dark", "system", "neon"];

/** 主题持久化：cookie（SSR 权威）+ localStorage（客户端首帧）共用同一键值 */
export const THEME_COOKIE = "wenan-theme";
export const THEME_STORAGE_KEY = "wenan-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 年

/** 服务端用：把任意值规整为合法主题，非法回退 "system" */
export function resolveTheme(value: string | null | undefined): ThemeName {
  if (value === "light" || value === "dark" || value === "neon") return value;
  return "system";
}

/** 客户端用：把任意值规整为合法主题 */
export function isThemeName(value: string | null | undefined): value is ThemeName {
  return (
    value === "light" || value === "dark" || value === "system" || value === "neon"
  );
}

/**
 * 内联防 FOUC 脚本（同步、极早执行，插入 <head>）：
 * cookie（SSR 已写入）→ localStorage（历史持久化）→ 系统偏好，
 * 首帧前把 data-theme 与 .dark 挂到 <html>，杜绝深色闪烁。
 * 与 SSR 的 resolveTheme(cookie) 逻辑一致，不产生 hydration 冲突。
 */
export const themeInitScript = `
(function () {
  try {
    var doc = document.documentElement;
    var stored = null;
    try { stored = document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/)?.[1] || null; } catch (e) {}
    if (!stored) { try { stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch (e) {} }
    var theme = stored;
    var dark = false;
    if (theme === "light" || theme === "dark" || theme === "neon") {
      dark = theme === "dark";
    } else {
      try { dark = window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) {}
      theme = dark ? "dark" : "light";
    }
    doc.setAttribute("data-theme", theme);
    doc.classList.toggle("dark", dark);
    doc.style.colorScheme = dark || theme === "neon" ? "dark" : "light";
  } catch (e) {}
})();
`;
