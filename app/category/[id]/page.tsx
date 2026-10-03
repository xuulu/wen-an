import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryHero, defaultCategoryDescription } from "@/components/library/category-hero";
import { LibraryShell } from "@/components/library/library-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentUser } from "@/lib/auth";
import {
  getCategories,
  getCategoryCounts,
  getCopyItems,
  getFavoritesCount,
} from "@/lib/copywriting-data";
import {
  breadcrumbJsonLd,
  buildSeoMetadata,
  faqPageJsonLd,
  getSeoContext,
  itemListJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { categoryFaqItems } from "@/components/library/category-hero";

export const dynamic = "force-dynamic";

/** 与服务端分页一致的页大小 */
const PAGE_SIZE = 50;

interface CategoryPageProps {
  params: Promise<{ id: string }>;
}

/** 分类着陆页标题：类目名已含「文案」时不再追加，避免「文案文案」重复 */
function categoryHeading(label: string): string {
  return label.endsWith("文案") ? `${label}大全` : `${label}文案大全`;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { id } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.id === id);
  if (!category) return { title: "分类不存在", robots: { index: false, follow: false } };

  // 类目名本身可能已含「文案」（如「雷霆文案」），避免拼出「文案文案」
  const heading = categoryHeading(category.label);
  const description =
    category.description?.trim() || defaultCategoryDescription(category.label);
  return buildSeoMetadata({
    title: heading,
    description,
    path: `/category/${category.id}`,
    type: "website",
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  const [categories] = await Promise.all([getCategories()]);
  const category = categories.find((c) => c.id === id);
  if (!category) notFound();

  // 随机种子：每次请求重新生成；服务端按种子确定性随机排序并分页
  const seed = randomUUID()
    .split("-")
    .reduce((acc, part) => (acc ^ parseInt(part, 16)) >>> 0, 0);

  const [firstPage, categoryCounts, favoritesCount] = await Promise.all([
    getCopyItems({
      userId: user?.id ?? 0,
      categoryId: id,
      pagination: { page: 1, pageSize: PAGE_SIZE },
      sort: "random",
      randomSeed: seed,
    }),
    getCategoryCounts(),
    getFavoritesCount(user?.id ?? 0),
  ]);

  const categoryItems = firstPage.items;
  const heading = categoryHeading(category.label);

  // 分类简介：后台填写优先，空则默认；generateMetadata 同步使用
  const description =
    category.description?.trim() || defaultCategoryDescription(category.label);

  const categoryCount = categoryCounts.find((cc) => cc.id === id)?.count ?? 0;

  // 对外域名：后台 site_url → SITE_URL env → 空（绝不输出 localhost）
  const seoContext = await getSeoContext();
  const { siteUrl } = seoContext;

  // JSON-LD：全站 WebSite + ItemList（前 20 条）+ 面包屑 + 局部 FAQ，合并为单 @graph
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      websiteJsonLd({
        name: seoContext.siteName,
        description: seoContext.settings.seo_description,
        siteUrl: siteUrl || undefined,
      }),
      itemListJsonLd({
        name: heading,
        description,
        items: categoryItems.slice(0, 20).map((item) => ({
          title: item.title,
          path: `/copy/${item.id}`,
        })),
        siteUrl,
      }),
      breadcrumbJsonLd(
        [{ name: "首页", path: "/" }, { name: category.label }],
        siteUrl
      ),
      faqPageJsonLd({ mainEntity: categoryFaqItems(category.label) }),
    ],
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <LibraryShell
        initialItems={firstPage.items}
        total={firstPage.total}
        categories={categories}
        categoryCounts={categoryCounts}
        favoritesCount={favoritesCount}
        isLoggedIn={!!user}
        userNickname={user?.nickname ?? ""}
        initialCategoryId={id}
        randomSeed={seed}
        sortMode="random"
        hero={
          <CategoryHero
            category={category}
            description={description}
            count={categoryCount}
          />
        }
        siteName={seoContext.siteName}
      />
    </>
  );
}
