import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { MarqueeBanner } from "@/components/library/marquee-banner";
import { SiteFooter } from "@/components/library/site-footer";
import { renderCustomHeadTags } from "@/lib/custom-head-tags";
import {
  getSiteSettings,
  resolveSiteUrl,
} from "@/lib/site-settings";
import { resolveTheme, themeInitScript } from "@/lib/theme";

/** 全站禁止用户手动缩放（移动端双指/双击、桌面 Ctrl±/Ctrl+滚轮均拦截，见下方 viewport export 与 blockZoomScript） */
const blockZoomScript = `(function(){
  function noop(e){e.preventDefault();}
  function onKey(e){
    if((e.ctrlKey||e.metaKey)&&(e.key==='+'||e.key==='-'||e.key==='='||e.key==='0')){e.preventDefault();}
  }
  function onWheel(e){
    if(e.ctrlKey||e.metaKey){e.preventDefault();}
  }
  document.addEventListener('wheel',onWheel,{passive:false});
  document.addEventListener('keydown',onKey);
  document.addEventListener('gesturestart',noop);
  document.addEventListener('gesturechange',noop);
  document.addEventListener('gestureend',noop);
})();`;

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** 把 public 相对路径补成完整 URL；未配置对外域名（base 为空）时返回空，不输出相对资源 */
function resolveAsset(path: string, base: string): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  if (!base) return "";
  return `${base}/${path.replace(/^\//, "")}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  // 对外域名：后台 site_url → SITE_URL env → 空（绝不输出 localhost）
  const siteUrl = resolveSiteUrl(settings);
  const ogImage = settings.site_og_image
    ? resolveAsset(settings.site_og_image, siteUrl)
    : "";

  return {
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    title: {
      default: `${settings.site_name} - ${settings.site_title_suffix}`,
      template: `%s | ${settings.site_name}`,
    },
    description: settings.seo_description,
    applicationName: settings.site_name,
    authors: [{ name: settings.site_name }],
    creator: settings.site_name,
    publisher: settings.site_name,
    alternates: { canonical: "/" },
    icons: settings.site_icon ? { icon: settings.site_icon } : undefined,
    openGraph: {
      type: "website",
      locale: "zh_CN",
      url: siteUrl || undefined,
      siteName: settings.site_name,
      title: `${settings.site_name} - ${settings.site_title_suffix}`,
      description: settings.seo_description,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${settings.site_name} - ${settings.site_title_suffix}`,
      description: settings.seo_description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    category: "文案",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  // 主题：SSR 从 cookie 解析（system 时 class 由首帧脚本定，SSR 不输出主题类，避免 hydration 冲突）
  const store = await cookies();
  const themeName = resolveTheme(store.get("wenan-theme")?.value);
  const isDarkSsr = themeName === "dark";
  // 后台「站点设置 → 自定义元标签」：每行一条完整 HTML 标签（meta/link/script/style），
  // 用于搜索引擎收录验证、访客统计等。仅管理员可写入（XSS 面 = 管理员本人）。
  const settings = await getSiteSettings();
  const customTags = settings.custom_head_tags;
  // 全站跑马灯：内容/速度/开关来自后台「站点设置」，作用于全局布局（前台所有页面）
  const marqueeSpeed = Number(settings.marquee_speed_seconds) || 32;

  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      data-theme={themeName !== "system" ? themeName : undefined}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${isDarkSsr ? "dark" : ""}`}
      style={isDarkSsr ? { colorScheme: "dark" } : undefined}
    >
      <head>
        {/* 防 FOUC：首帧前同步设置主题（与 SSR cookie 解析逻辑一致） */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* 全站屏蔽放大缩小（Ctrl± / Ctrl+滚轮 / 移动端手势） */}
        <script dangerouslySetInnerHTML={{ __html: blockZoomScript }} />
        {/* 自定义 head 标签（管理员后台配置，SSR 原样输出以便收录验证生效） */}
        {renderCustomHeadTags(customTags)}
      </head>
      <body className="min-h-full flex flex-col overscroll-x-none">
        {/* 探探卡片流：body 禁横向 overscroll，组件内另有 touchmove 兜底，防浏览器历史滑动/后退手势 */}
        <ThemeProvider initialTheme={themeName}>
          {/* 全站跑马灯：全局布局统一渲染，前台所有页面可见 */}
          <MarqueeBanner
            enabled={settings.marquee_enabled !== "false"}
            content={settings.marquee_content}
            speedSeconds={marqueeSpeed}
          />
          {children}
        </ThemeProvider>
        {/* 全站页脚：统一在全局布局渲染，各页面不再手动引入（分类导航在此，全站可见利于 SEO） */}
        <SiteFooter />
      </body>
    </html>
  );
}
