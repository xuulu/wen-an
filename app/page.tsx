import { randomUUID } from "node:crypto";

import type { Metadata } from "next";

import { LibraryShell } from "@/components/library/library-shell";
import { MarqueeBanner } from "@/components/library/marquee-banner";
import { SiteFooter } from "@/components/library/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentUser } from "@/lib/auth";
import {
  getCategories,
  getCopyItems,
  getTopFavorited,
} from "@/lib/copywriting-data";
import { buildSeoMetadata, getSeoContext } from "@/lib/seo";
import type { CopyItem } from "@/lib/copywriting";

export const dynamic = "force-dynamic";

/** 按日期确定性选择一条推荐文案（同一天固定同一条） */
function pickDailyRecommend(items: CopyItem[]): CopyItem | null {
  if (items.length === 0) return null;
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000
  );
  return items[dayOfYear % items.length];
}

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    title: "精选文案灵感库 · 一键复制",
    path: "/",
    type: "website",
  });
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  const { q } = await searchParams;

  const [categories, { items }, hotItems] = await Promise.all([
    getCategories(),
    getCopyItems({ userId: user?.id ?? 0 }),
    getTopFavorited(5, true),
  ]);

  const initialRecommended = pickDailyRecommend(items);

  // 首页结构化数据：WebPage（含搜索意图）+ Organization，不重复根布局的 WebSite
  const seoContext = await getSeoContext();
  const { siteUrl } = seoContext;
  const homepageJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: `${seoContext.siteName} - 精选文案灵感库`,
        ...(siteUrl ? { url: siteUrl } : {}),
        inLanguage: "zh-CN",
      },
      {
        "@type": "Organization",
        name: seoContext.siteName,
        ...(siteUrl ? { url: siteUrl } : {}),
        ...(seoContext.settings.site_logo
          ? { logo: seoContext.settings.site_logo }
          : {}),
      },
    ],
  };

  return (
    <>
      <JsonLd data={homepageJsonLd} />
      <MarqueeBanner />
      <LibraryShell
        items={items}
        categories={categories}
        initialRecommended={initialRecommended}
        isLoggedIn={!!user}
        userNickname={user?.nickname ?? ""}
        hotItems={hotItems}
        seed={randomUUID().split("-").reduce((acc, part) => (acc ^ parseInt(part, 16)) >>> 0, 0)}
        initialQuery={q ?? ""}
        footer={<SiteFooter />}
      />
    </>
  );
}
