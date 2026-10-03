import { BrowseLayout } from "@/components/library/browse-layout";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, LayoutGrid } from "lucide-react";

import { JsonLd } from "@/components/seo/json-ld";
import {
  getCategories,
  getCategoryCounts,
} from "@/lib/copywriting-data";
import {
  buildSeoMetadata,
  getSeoContext,
  websiteJsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getSeoContext();
  return buildSeoMetadata({
    title: `全部分类 - ${ctx.siteName}`,
    description:
      ctx.settings.seo_description ||
      `${ctx.siteName}的全部分类导航，浏览各分类精选文案合集。`,
    path: "/categories",
    type: "website",
  });
}

export default async function CategoriesPage() {
  const seoContext = await getSeoContext();
  const { siteUrl } = seoContext;

  const [categories, counts] = await Promise.all([
    getCategories(),
    getCategoryCounts(),
  ]);

  const withCounts = categories.map((category) => ({
    category,
    count: counts.find((c) => c.id === category.id)?.count ?? 0,
  }));

  const categoryJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      websiteJsonLd({
        name: seoContext.siteName,
        description: seoContext.settings.seo_description,
        siteUrl: siteUrl || undefined,
      }),
      {
        "@type": "CollectionPage",
        name: `全部分类 - ${seoContext.siteName}`,
        ...(siteUrl ? { url: `${siteUrl}/categories` } : {}),
        inLanguage: "zh-CN",
        mainEntity: {
          "@type": "ItemList",
          name: "全部分类",
          itemListElement: withCounts.map(({ category }, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: category.label,
            ...(siteUrl
              ? { url: `${siteUrl}/category/${category.id}` }
              : {}),
          })),
        },
      },
    ],
  };

  return (
    <BrowseLayout activeId="categories">
      <JsonLd data={categoryJsonLd} />
      <div className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <nav
            aria-label="面包屑"
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground">
              首页
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground/70">全部分类</span>
          </nav>

          <div className="mt-3 flex items-center gap-2.5">
            <LayoutGrid className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              全部分类
            </h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {seoContext.settings.seo_description ||
              `${seoContext.siteName}按主题整理了多类精选文案，选择你感兴趣的分类浏览并一键复制。`}
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {withCounts.map(({ category, count }) => (
            <Link
              key={category.id}
              href={`/category/${category.id}`}
              className="group relative flex flex-col gap-2 overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:ring-1 hover:ring-foreground/15"
            >
              <span
                aria-hidden
                className="absolute top-0 left-0 h-full w-1"
                style={{ backgroundColor: category.color }}
              />
              <span className="flex items-center gap-2 pl-2">
                <span className="text-base font-semibold">
                  {category.label}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {count} 条
                </span>
                <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="line-clamp-2 pl-2 text-sm leading-relaxed text-muted-foreground">
                {category.description?.trim() ||
                  `${category.label}精选文案合集，支持搜索、收藏与一键复制。`}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </BrowseLayout>
  );
}
