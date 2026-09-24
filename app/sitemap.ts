import type { MetadataRoute } from "next";

import { getCategories, getCopyItems } from "@/lib/copywriting-data";
import { getSiteSettings, resolveSiteUrl } from "@/lib/site-settings";

/**
 * 站点地图（App Router）：
 * 首页 + 分类着陆页（/category/[id]）+ 各已上架文案详情页（/copy/[id]）。
 *
 * - 域名来自后台「站点设置」的 site_url（或环境变量 SITE_URL 兜底）；
 *   未配置 / localhost 时返回空数组，绝不向搜索引擎输出本机地址。
 * - 缓存 24 小时（revalidate = 86400），每日自动重新生成；
 *   后台修改域名后，缓存到期即生效（Next.js 按时间自动再验证）。
 *
 * Pages Router 等价方案（如项目改用 Pages Router）：
 *   pages/sitemap.xml.tsx ——
 *   ```tsx
 *   import { getServerSideProps } from "next"; // 或 getStaticProps + revalidate: 86400
 *   export default function Sitemap() {}
 *   export async function getServerSideProps({ res }) {
 *     const settings = await getSiteSettings();
 *     const siteUrl = resolveSiteUrl(settings);
 *     const urls = [siteUrl, ...categories.map(c => `${siteUrl}/category/${c.id}`), ...items.map(i => `${siteUrl}/copy/${i.id}`)];
 *     res.setHeader("Content-Type", "application/xml");
 *     res.write(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${u}</loc></url>`).join("")}</urlset>`);
 *     res.end();
 *     return { props: {} };
 *   }
 *   ```
 *   （getStaticProps + revalidate: 86400 可实现同样的每日重建缓存。）
 */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSiteSettings();
  const siteUrl = resolveSiteUrl(settings);
  // 未配置对外域名（或仍是 localhost）：不输出任何 URL，避免污染搜索引擎索引
  if (!siteUrl) return [];

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
    // 分类着陆页
    const categories = await getCategories();
    for (const category of categories) {
      entries.push({
        url: `${siteUrl}/category/${category.id}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }

    // 详情页：全部已上架文案（getCopyItems 默认 status="approved"），供搜索引擎收录长尾页面
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
