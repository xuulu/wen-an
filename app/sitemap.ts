import type { MetadataRoute } from "next";

import { getCategories } from "@/lib/copywriting-data";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * 站点地图：首页 + 各分类页（分类作为带 category 参数的静态路由收录）。
 * 页面是 force-dynamic，每次请求实时生成，lastModified 取当前时间。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSiteSettings();
  const siteUrl = settings.site_url;
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  try {
    const categories = await getCategories();
    for (const category of categories) {
      entries.push({
        url: `${siteUrl}/?category=${encodeURIComponent(category.id)}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  } catch {
    // 数据库不可用时至少返回首页
  }

  return entries;
}
