import type { MetadataRoute } from "next";

import { getCategories, getCopyItems } from "@/lib/copywriting-data";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * 站点地图：首页 + 分类着陆页 + 各文案详情页。
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
        url: `${siteUrl}/category/${category.id}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }

    // 详情页：全部已上架文案，供搜索引擎收录长尾页面
    const { items } = await getCopyItems();
    for (const item of items) {
      entries.push({
        url: `${siteUrl}/copy/${item.id}`,
        lastModified: new Date(`${item.updatedAt}T00:00:00`),
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  } catch {
    // 数据库不可用时至少返回首页
  }

  return entries;
}
