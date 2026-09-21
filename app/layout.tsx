import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { getSiteSettings } from "@/lib/site-settings";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** 把 public 相对路径补成完整 URL */
function resolveAsset(path: string, base: string): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${base}/${path.replace(/^\//, "")}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const keywords = settings.seo_keywords
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);
  const ogImage = settings.site_og_image
    ? resolveAsset(settings.site_og_image, settings.site_url)
    : "";

  return {
    metadataBase: new URL(settings.site_url),
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
      url: settings.site_url,
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.site_name,
    url: settings.site_url,
    description: settings.seo_description,
    inLanguage: "zh-CN",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${settings.site_url}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
