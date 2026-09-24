import type { CSSProperties } from "react";

/** 文案审核状态：用户投稿为 pending，管理员审核后 approved/rejected */
export type CopyStatus = "pending" | "approved" | "rejected";

export interface CopyItem {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  favorite: boolean;
  status: CopyStatus;
  updatedAt: string;
  /** 审核拒绝/不确定原因，通过时为空 */
  reviewReason?: string;
}

/** 用户后台「我的收藏/投稿」列表项，附带类目名称与配色 */
export interface MyCopyItem extends CopyItem {
  categoryLabel: string;
  categoryColor: string;
}

export interface Category {
  id: string;
  label: string;
  /** 类目配色，#RRGGBB 十六进制色值，见 getCategoryStyle */
  color: string;
  /** 排序权重（管理后台可调整） */
  sortOrder?: number;
}

/** 新类目默认配色 */
export const DEFAULT_CATEGORY_COLOR = "#6366f1";

/** 管理后台预设色板（Tailwind 500 色系，均为 #RRGGBB） */
export const CATEGORY_PRESET_COLORS: string[] = [
  "#f43f5e",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#64748b",
];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value);
}

/** 旧版固定色名 → hex，用于兼容历史数据 */
const LEGACY_COLOR_MAP: Record<string, string> = {
  rose: "#f43f5e",
  sky: "#0ea5e9",
  pink: "#ec4899",
  violet: "#8b5cf6",
  emerald: "#10b981",
  amber: "#f59e0b",
  cyan: "#06b6d4",
};

/** 把任意历史/异常色值归一成合法 hex */
export function normalizeCategoryColor(value: string): string {
  if (isValidHexColor(value)) return value.toLowerCase();
  return LEGACY_COLOR_MAP[value] ?? DEFAULT_CATEGORY_COLOR;
}

export interface CategoryStyle {
  /** 卡片顶部色条 */
  accent: CSSProperties;
  /** 侧边栏图标底色 */
  iconBg: CSSProperties;
  /** 小圆点 */
  dot: CSSProperties;
  /** 类目徽标：浅底 + 文字 */
  badge: CSSProperties;
}

/**
 * 根据类目 hex 生成各展示位的内联样式。
 * 浅底用 color-mix 与透明色混合（明暗主题都适配）；
 * 文字混入 CanvasText 系统色，浅色主题自动加深、深色主题自动提亮。
 */
export function getCategoryStyle(color: string): CategoryStyle {
  const hex = normalizeCategoryColor(color);
  const tint = `color-mix(in srgb, ${hex} 12%, transparent)`;
  const foreground = `color-mix(in srgb, ${hex} 68%, CanvasText)`;

  return {
    accent: { backgroundColor: hex },
    iconBg: { backgroundColor: tint, color: foreground },
    dot: { backgroundColor: hex },
    badge: { backgroundColor: tint, color: foreground },
  };
}

/** 审核状态的中文名与徽标样式 */
export const statusLabels: Record<CopyStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
};

export const statusStyles: Record<CopyStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  rejected: "bg-muted text-muted-foreground",
};
