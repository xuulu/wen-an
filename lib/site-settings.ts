import "server-only";

import { query } from "@/lib/db";

/** 全部站点设置 key 及默认值（DB 缺失时兜底） */
export const SETTING_DEFAULTS = {
  // 基本
  site_name: "简心文案库",
  site_title_suffix: "精选文案灵感库 · 一键复制",
  // 站点对外域名（https://example.com）。留空时 sitemap/robots/OG 不输出本机地址，
  // 部署兜底可用环境变量 SITE_URL（见 resolveSiteUrl）。
  site_url: "",
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
  // 用户批量投稿冷却（成功投稿后再次投稿需等待，支持 1h/30m/2d 等格式；env 无对应变量）
  user_batch_cooldown: "1h",
  // 首页顶部跑马灯（后台可视化配置，纯文本，不嵌入 HTML）
  marquee_enabled: "true",
  marquee_content:
    "社区共建需要大家，欢迎注册投稿，为社区贡献一份力量。",
  // 跑马灯滚动一周时长（秒）；越小越快
  marquee_speed_seconds: "32",
  // 投稿删除：被收藏数达到该阈值的文案受社区保护，作者不可单方面删除
  deletion_favorite_threshold: "3",
  // 回收站冷静期天数；到期后由定时任务物理删除
  deletion_grace_days: "30",
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

/* ---------------- SEO 域名解析 ---------------- */

/** 本机地址（localhost / 127.0.0.1 / 0.0.0.0 / ::1）视为未配置，绝不能进 sitemap / robots / OG */
export function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1"
    );
  } catch {
    return true; // 非法 URL 视为未配置
  }
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * 解析对外站点域名（完整 origin，不含尾部斜杠），供 sitemap / robots / metadataBase / OG 使用。
 * 优先级：后台「站点设置」的 site_url → 环境变量 SITE_URL → 空字符串（未配置）。
 * localhost 等本机地址一律视为未配置，避免 SEO 输出本机地址。
 */
export function resolveSiteUrl(settings: SiteSettings): string {
  const candidates = [settings.site_url?.trim(), process.env.SITE_URL?.trim()];
  for (const raw of candidates) {
    if (!raw) continue;
    if (!/^https?:\/\//i.test(raw)) continue;
    if (isLocalhostUrl(raw)) continue;
    return trimTrailingSlash(raw);
  }
  return "";
}
