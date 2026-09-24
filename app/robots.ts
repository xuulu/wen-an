import type { MetadataRoute } from "next";

import { getSiteSettings, resolveSiteUrl } from "@/lib/site-settings";

/**
 * robots（App Router）：允许收录首页与公开内容，禁止抓取 /admin、/user 与 API。
 *
 * - 域名来自后台「站点设置」的 site_url（或环境变量 SITE_URL 兜底）；
 *   未配置 / localhost 时返回禁止抓取的保守规则，绝不向搜索引擎暴露本机地址。
 * - 缓存 24 小时（revalidate = 86400）。
 *
 * Pages Router 等价方案（如项目改用 Pages Router）：
 *   pages/robots.txt.tsx ——
 *   ```tsx
 *   export default function Robots() {}
 *   export async function getServerSideProps({ res }) {
 *     const settings = await getSiteSettings();
 *     const siteUrl = resolveSiteUrl(settings);
 *     res.setHeader("Content-Type", "text/plain");
 *     res.write(
 *       !siteUrl
 *         ? "User-agent: *\nDisallow: /\n"
 *         : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /user\nDisallow: /api\nSitemap: ${siteUrl}/sitemap.xml\nHost: ${siteUrl}\n`
 *     );
 *     res.end();
 *     return { props: {} };
 *   }
 *   ```
 */
export const revalidate = 86400;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings();
  const siteUrl = resolveSiteUrl(settings);

  // 未配置对外域名（或仍是 localhost）：禁止抓取，防止搜索引擎收录本机地址
  if (!siteUrl) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/user", "/api"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
