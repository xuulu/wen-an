import "server-only";

import type { Metadata } from "next";

import {
  getSiteSettings,
  resolveSiteUrl,
  type SiteSettings,
} from "@/lib/site-settings";

/**
 * 统一 SEO 工具：所有页面共用，避免每页重复读设置 / 拼 Meta。
 * 页面职责只剩：标题、描述、路径、是否需要 noindex。
 */

export interface SeoContext {
  settings: SiteSettings;
  /** 对外域名（后台 site_url → SITE_URL env → 空；绝不输出 localhost） */
  siteUrl: string;
  siteName: string;
}

/** 把 public 相对路径补成完整 URL；无对外域名时返回空（不输出相对资源） */
function resolveAsset(path: string, base: string): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  if (!base) return "";
  return `${base}/${path.replace(/^\//, "")}`;
}

/** 获取页面所需的 SEO 上下文（内部复用站点设置 30s 缓存） */
export async function getSeoContext(): Promise<SeoContext> {
  const settings = await getSiteSettings();
  const siteUrl = resolveSiteUrl(settings);
  return {
    settings,
    siteUrl,
    siteName: settings.site_name,
  };
}

export interface SeoPageOptions {
  /** 页面标题（不含站点名；会自动套用 layout 的 %s | 站点名 模板） */
  title: string;
  /** 页面描述，建议 50-160 字 */
  description?: string;
  /** 页面路径（相对，如 /copy/123）；拼接 siteUrl 生成 canonical 与 OG url */
  path?: string;
  /** 分类等 SEO 关键词 */
  keywords?: string[];
  /** 指定 OG 图片（相对路径或完整 URL）；缺省用站点分享图 */
  ogImage?: string;
  /** 页面类型（OG type） */
  type?: "website" | "article";
  /** 不应被索引的页面（如文案不存在）传 true */
  noIndex?: boolean;
}

/**
 * 统一组装 Metadata：title / description / keywords /
 * canonical / OG / Twitter / robots，逐项缺省兜底。
 */
export async function buildSeoMetadata(
  options: SeoPageOptions
): Promise<Metadata> {
  const ctx = await getSeoContext();
  const { settings, siteUrl, siteName } = ctx;

  const fullUrl = options.path && siteUrl ? `${siteUrl}${options.path}` : "";
  const pageDescription =
    options.description?.slice(0, 160) || settings.seo_description;
  const keywords = options.keywords?.length
    ? options.keywords
    : settings.seo_keywords
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);
  const ogImage = options.ogImage
    ? resolveAsset(options.ogImage, siteUrl)
    : settings.site_og_image
      ? resolveAsset(settings.site_og_image, siteUrl)
      : "";

  return {
    title: options.title,
    description: pageDescription,
    keywords,
    alternates: options.path ? { canonical: options.path } : undefined,
    openGraph: {
      type: options.type ?? "website",
      locale: "zh_CN",
      ...(fullUrl ? { url: fullUrl } : {}),
      siteName,
      title: options.title,
      description: pageDescription,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: pageDescription,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: options.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };
}

/* ---------------- JSON-LD 构建器（返回结构化对象，交由 <JsonLd> 安全渲染） ---------------- */

export interface BreadcrumbEntry {
  name: string;
  /** 相对路径（如 /copy/1）或完整 URL；无站点域名时省略 item 字段 */
  path?: string;
}

/** 面包屑 schema（需配 @graph 使用） */
export function breadcrumbJsonLd(
  entries: BreadcrumbEntry[],
  siteUrl: string
): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: entries.map((entry, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: entry.name,
      ...(entry.path && siteUrl ? { item: `${siteUrl}${entry.path}` } : {}),
    })),
  };
}

/** 文案详情页 CreativeWork schema */
export function creativeWorkJsonLd(options: {
  title: string;
  content: string;
  path: string;
  siteUrl: string;
  date: string;
  category?: string;
}): Record<string, unknown> {
  const { title, content, path, siteUrl, date, category } = options;
  return {
    "@type": "CreativeWork",
    name: title,
    text: content,
    ...(siteUrl ? { url: `${siteUrl}${path}` } : {}),
    datePublished: date,
    dateModified: date,
    ...(category ? { articleSection: category } : {}),
  };
}

/** 分类页 ItemList schema（前 max 条） */
export function itemListJsonLd(options: {
  name: string;
  description: string;
  items: { title: string; path: string }[];
  siteUrl: string;
}): Record<string, unknown> {
  const { name, description, items, siteUrl } = options;
  return {
    "@type": "ItemList",
    name,
    description,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.title,
      ...(siteUrl ? { url: `${siteUrl}${item.path}` } : {}),
    })),
  };
}
