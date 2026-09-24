import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LibraryShell } from "@/components/library/library-shell";
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
import {
  breadcrumbJsonLd,
  buildSeoMetadata,
  getSeoContext,
  itemListJsonLd,
} from "@/lib/seo";
import type { CopyItem } from "@/lib/copywriting";

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

/** 按日期确定性选择一条推荐文案（同一天固定同一条） */
function pickDailyRecommend(items: CopyItem[]): CopyItem | null {
  if (items.length === 0) return null;
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000
  );
  return items[dayOfYear % items.length];
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
  const description = `${category.label}精选合集，每日更新优质${category.label}模板，一键复制即用。`;
  return buildSeoMetadata({
    title: heading,
    description,
    path: `/category/${category.id}`,
    keywords: [category.label, `${category.label}文案`, "文案大全"],
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

  const [firstPage, hotItems, categoryCounts, favoritesCount] =
    await Promise.all([
      getCopyItems({
        userId: user?.id ?? 0,
        categoryId: id,
        pagination: { page: 1, pageSize: PAGE_SIZE },
        sort: "random",
        randomSeed: seed,
      }),
      getTopFavorited(5, true),
      getCategoryCounts(),
      getFavoritesCount(user?.id ?? 0),
    ]);

  const categoryItems = firstPage.items;
  const initialRecommended = pickDailyRecommend(categoryItems);
  const heading = categoryHeading(category.label);

  // 对外域名：后台 site_url → SITE_URL env → 空（绝不输出 localhost）
  const { siteUrl } = await getSeoContext();

  // JSON-LD：ItemList（前 20 条）+ 面包屑，供搜索结果增强展现
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      itemListJsonLd({
        name: heading,
        description: `${category.label}精选合集`,
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
        initialRecommended={initialRecommended}
        isLoggedIn={!!user}
        userNickname={user?.nickname ?? ""}
        hotItems={hotItems}
        initialCategoryId={id}
        randomSeed={seed}
        sortMode="random"
        footer={<SiteFooter />}
      />
    </>
  );
}
