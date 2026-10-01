import type { MetadataRoute } from "next";

import { getSiteSettings } from "@/lib/site-settings";

/** PWA / 浏览器清单（品牌名跟随后台站点配置） */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();
  const name = settings.site_name || "简心文案库";
  const description =
    settings.seo_description ||
    "精选文案灵感库，搜索、收藏、一键复制。";

  return {
    name,
    short_name: name.slice(0, 4),
    description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#020617",
    lang: "zh-CN",
    icons: [],
  };
}
