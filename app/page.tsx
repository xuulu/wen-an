import { randomUUID } from "node:crypto";

import type { Metadata } from "next";

import { SwipeStack } from "@/components/library/swipe-stack";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentUser } from "@/lib/auth";
import { getCategories, getCopyItems } from "@/lib/copywriting-data";
import { buildSeoMetadata, getSeoContext, websiteJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** 探探风格卡片流首屏加载量（看完可「换一批」） */
const SWIPE_PAGE_SIZE = 30;

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getSeoContext();
  return buildSeoMetadata({
    title: `${ctx.siteName} - ${ctx.settings.site_title_suffix}`,
    description: ctx.settings.seo_description,
    path: "/",
    type: "website",
  });
}

export default async function SwipeHome() {
  const user = await getCurrentUser();

  // 随机种子：每次请求重新生成，刷新即换一批
  const seed = randomUUID()
    .split("-")
    .reduce((acc, part) => (acc ^ parseInt(part, 16)) >>> 0, 0);

  const [categories, firstPage] = await Promise.all([
    getCategories(),
    getCopyItems({
      userId: user?.id ?? 0,
      pagination: { page: 1, pageSize: SWIPE_PAGE_SIZE },
      sort: "random",
      randomSeed: seed,
    }),
  ]);

  const seoContext = await getSeoContext();
  const { siteUrl } = seoContext;
  const homepageJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      websiteJsonLd({
        name: seoContext.siteName,
        description: seoContext.settings.seo_description,
        siteUrl: siteUrl || undefined,
      }),
      {
        "@type": "WebPage",
        name: `${seoContext.siteName} - ${seoContext.settings.site_title_suffix}`,
        ...(siteUrl ? { url: siteUrl } : {}),
        inLanguage: "zh-CN",
      },
    ],
  };

  return (
    <>
      <JsonLd data={homepageJsonLd} />
      <main className="flex min-h-[calc(100dvh-var(--footer-h,0px))] flex-1 flex-col py-2">
        <SwipeStack
          items={firstPage.items}
          categories={categories}
          isLoggedIn={!!user}
          siteName={seoContext.siteName}
        />
      </main>
    </>
  );
}
