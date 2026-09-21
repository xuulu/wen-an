import "server-only";

import { query } from "@/lib/db";

/** 全部站点设置 key 及默认值（DB 缺失时兜底） */
export const SETTING_DEFAULTS = {
  // 基本
  site_name: "简心文案库",
  site_title_suffix: "精选文案灵感库 · 一键复制",
  site_url: "http://localhost:3000",
  site_icon: "/favicon.ico",
  site_logo: "",
  site_og_image: "",
  // SEO
  seo_description:
    "简心文案库 — 精选朋友圈、短视频、小红书、节日祝福、诗句等分类文案，支持关键词搜索、收藏与一键复制，快速找到灵感。",
  seo_keywords:
    "文案,文案库,简心文案库,朋友圈文案,短视频文案,小红书文案,节日祝福语,诗句,文案复制,文案灵感",
  // 页脚
  footer_about: "简心文案库 — 让每一次表达都有灵感。",
  footer_contact: "",
  footer_icp: "",
  footer_copyright: `© ${new Date().getFullYear()} 简心文案库`,
  // 审核机审开关（投稿统一走机审，三态：通过/拒绝/转人工）
  review_keyword_enabled: "true",
  review_ai_enabled: "false",
  review_blocked_keywords: "违禁词,赌博,色情",
  // AI（OpenAI 兼容）
  ai_base_url: "https://api.openai.com/v1",
  ai_api_key: "",
  ai_model: "gpt-4o-mini",
  // AI 审核提示词（后台可视化编辑）
  ai_review_prompt:
    "你是内容审核员。判断用户提交的文案是否合规。只返回 JSON，不要输出其他内容：内容明确合规则 {\"passed\": true, \"reason\": \"内容合规\"}；含违法、色情、赌博、暴力、虚假宣传、恶意引战等则 {\"passed\": false, \"reason\": \"简要中文理由\"}；无法确定或处于灰色地带则 {\"passed\": \"uncertain\", \"reason\": \"需要人工复核的原因\"}",
  // 审核日志保留条数（超出自动清理最旧记录）
  review_log_retention: "1000",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SiteSettings = Record<SettingKey, string>;

let cache: { data: SiteSettings; at: number } | null = null;
/** 设置缓存 30 秒，更新时主动失效 */
const CACHE_TTL_MS = 30_000;

/** 获取全部站点设置 */
export async function getSiteSettings(): Promise<SiteSettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  const { rows } = await query<{ key: string; value: string }>(
    "SELECT key, value FROM wenan_site_settings"
  );
  const dbMap = new Map(rows.map((row) => [row.key, row.value]));

  const data = Object.fromEntries(
    Object.entries(SETTING_DEFAULTS).map(([key, fallback]) => [
      key,
      dbMap.get(key) ?? fallback,
    ])
  ) as SiteSettings;

  cache = { data, at: Date.now() };
  return data;
}

/** 批量更新设置，返回更新后的全部设置 */
export async function updateSiteSettings(
  patch: Partial<Record<SettingKey, string>>
): Promise<SiteSettings> {
  const entries = Object.entries(patch);
  for (const [key, value] of entries) {
    if (!(key in SETTING_DEFAULTS)) continue;
    await query(
      `INSERT INTO wenan_site_settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value ?? ""]
    );
  }
  cache = null;
  return getSiteSettings();
}

export function invalidateSiteSettingsCache(): void {
  cache = null;
}
