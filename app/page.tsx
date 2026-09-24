import { randomUUID } from "node:crypto";

import type { Metadata } from "next";

import { LibraryShell } from "@/components/library/library-shell";
import { MarqueeBanner } from "@/components/library/marquee-banner";
import { SiteFooter } from "@/components/library/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentUser } from "@/lib/auth";
import {
  getCategories,
  getCategoryCounts,
  getCopyItems,
  getFavoritesCount,
  getTopFavorited,
} from "@/lib/copywriting-data";
import { buildSeoMetadata, getSeoContext } from "@/lib/seo";
import { getSiteSettings } from "@/lib/site-settings";
import type { CopyItem } from "@/lib/copywriting";

export const dynamic = "force-dynamic";

/** 首页服务端分页页大小（后续翻页由 /api/copy 服务端加载） */
export const HOME_PAGE_SIZE = 50;

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
  // 首页标题跟随后台「站点设置」：站点名 + 标题后缀
  const ctx = await getSeoContext();
  return buildSeoMetadata({
    title: `${ctx.siteName} - ${ctx.settings.site_title_suffix}`,
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

  // 随机种子：每次请求重新生成，F5 重新随机；分页顺序在同种子下稳定
  const seed = randomUUID()
    .split("-")
    .reduce((acc, part) => (acc ^ parseInt(part, 16)) >>> 0, 0);

  const [categories, firstPage, hotItems, categoryCounts, favoritesCount] =
    await Promise.all([
      getCategories(),
      getCopyItems({
        userId: user?.id ?? 0,
        pagination: { page: 1, pageSize: HOME_PAGE_SIZE },
        search: q?.trim() || undefined,
        sort: "random",
        randomSeed: seed,
      }),
      getTopFavorited(5, true),
      getCategoryCounts(),
      getFavoritesCount(user?.id ?? 0),
    ]);

  const initialRecommended = pickDailyRecommend(firstPage.items);

  // 首页跑马灯：内容/速度/开关来自后台「站点设置」（纯文本，不嵌入 HTML）
  const settings = await getSiteSettings();
  const marqueeSpeed = Number(settings.marquee_speed_seconds) || 32;

  // 首页结构化数据：WebPage（含搜索意图）+ Organization，不重复根布局的 WebSite
  const seoContext = await getSeoContext();
  const { siteUrl } = seoContext;
  const homepageJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: `${seoContext.siteName} - ${seoContext.settings.site_title_suffix}`,
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
      <MarqueeBanner
        enabled={settings.marquee_enabled !== "false"}
        content={settings.marquee_content}
        speedSeconds={marqueeSpeed}
      />
      <LibraryShell
        initialItems={firstPage.items}
        total={firstPage.total}
        categories={categories}
        categoryCounts={categoryCounts}
        favoritesCount={favoritesCount}
        initialRecommended={initialRecommended}
        isLoggedIn={!!user}
        userNickname={user?.nickname ?? ""}
        hotItems={hotItems}
        randomSeed={seed}
        sortMode="random"
        initialQuery={q ?? ""}
        footer={<SiteFooter />}
      />
    </>
  );
}
