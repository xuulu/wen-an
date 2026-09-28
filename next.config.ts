import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * 缓存 / CDN 响应头策略
   *
   * 原则：
   * - _next/static 构建产物含内容哈希 → 一年强缓存 + CDN-Cache-Control（CDN 识别）；
   * - sitemap / robots 每天重生成（路由内 revalidate=86400）→ CDN 层 1 小时 + 回源宽容；
   * - 图片优化端点 → CDN 层缓存 1 天，容忍一周回源；
   * - /uploads/ 用户上传资源 → 7 天缓存；
   * - /api 不在全局配置缓存：接口含用户私有数据（收藏态 / 登录态 / 管理端），
   *   缓存在各 route handler 内按“公开只读 / 私有 / 写操作”精确设置，见 app/api 内注释。
   */
  async headers() {
    return [
      // ---- Next.js 构建产物：文件名含哈希，可永久缓存 ----
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          // CDN 层同策略（部分 CDN 只认自己的头；无 CDN 时无害）
          { key: "CDN-Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Vary", value: "Accept-Encoding" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      // ---- 内置图片优化端点 ----
      {
        source: "/_next/image(.*)",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      // ---- SEO 动态文件（路由内每日 revalidate）----
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600",
          },
        ],
      },
      // ---- 用户上传资源 ----
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
