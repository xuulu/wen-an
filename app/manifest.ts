import type { MetadataRoute } from "next";

/** PWA / 浏览器清单 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "简心文案库",
    short_name: "简心文案",
    description: "精选文案灵感库，搜索、收藏、一键复制。",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#020617",
    lang: "zh-CN",
    icons: [],
  };
}
