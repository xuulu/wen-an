import type { MetadataRoute } from "next";

import { getSiteSettings } from "@/lib/site-settings";

/**
 * robots：允许收录首页与公开内容，禁止抓取 /admin、/user 与 API。
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings();
  const siteUrl = settings.site_url;
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
