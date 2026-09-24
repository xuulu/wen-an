import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import {
  getSiteSettings,
  resolveSiteUrl,
} from "@/lib/site-settings";
import { resolveTheme, themeInitScript } from "@/lib/theme";

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
  const keywords = settings.seo_keywords
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);
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
    keywords,
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  const siteUrl = resolveSiteUrl(settings);
  // 主题：SSR 从 cookie 解析（system 时 class 由首帧脚本定，SSR 不输出主题类，避免 hydration 冲突）
  const store = await cookies();
  const themeName = resolveTheme(store.get("wenan-theme")?.value);
  const isDarkSsr = themeName === "dark";
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.site_name,
    description: settings.seo_description,
    inLanguage: "zh-CN",
    ...(siteUrl
      ? {
          url: siteUrl,
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${siteUrl}/?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        }
      : {}),
  };

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
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider initialTheme={themeName}>{children}</ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
