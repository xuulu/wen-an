"use client";

import { Monitor, Moon, Sparkles, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import type { ThemeName } from "@/lib/theme";

const OPTIONS: { value: ThemeName; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "浅色", icon: <Sun className="size-4" /> },
  { value: "dark", label: "深色", icon: <Moon className="size-4" /> },
  { value: "system", label: "跟随系统", icon: <Monitor className="size-4" /> },
  { value: "neon", label: "霓虹", icon: <Sparkles className="size-4" /> },
];

/** 主题切换器：浅色 / 深色 / 跟随系统 / 霓虹彩蛋 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="mb-1 flex items-center gap-1 rounded-md bg-muted/40 p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.label}
          aria-label={`切换主题：${option.label}`}
          aria-pressed={theme === option.value}
          onClick={() => setTheme(option.value)}
          className={`flex flex-1 items-center justify-center rounded-md px-2 py-1.5 transition-colors ${
            theme === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.icon}
          <span className="ml-1.5 hidden text-xs font-medium sm:inline">
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}
