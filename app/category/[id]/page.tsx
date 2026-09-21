import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LibraryShell } from "@/components/library/library-shell";
import { SiteFooter } from "@/components/library/site-footer";
import { getCurrentUser } from "@/lib/auth";
import {
  getCategories,
  getCopyItems,
  getTopFavorited,
} from "@/lib/copywriting-data";
import { getSiteSettings } from "@/lib/site-settings";
import type { CopyItem } from "@/lib/copywriting";

export const dynamic = "force-dynamic";

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
  const [categories, settings] = await Promise.all([
    getCategories(),
    getSiteSettings(),
  ]);
  const category = categories.find((c) => c.id === id);
  if (!category) return { title: "分类不存在" };

  // 类目名本身可能已含「文案」（如「雷霆文案」），避免拼出「文案文案」
  const heading = categoryHeading(category.label);
  const description = `${category.label}精选合集，每日更新优质${category.label}模板，一键复制即用。${settings.seo_description}`;
  return {
    title: heading,
    description,
    alternates: { canonical: `/category/${category.id}` },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  const [categories, settings, { items }, hotItems] = await Promise.all([
    getCategories(),
    getSiteSettings(),
    getCopyItems({ userId: user?.id ?? 0 }),
    getTopFavorited(5, true),
  ]);

  const category = categories.find((c) => c.id === id);
  if (!category) notFound();

  const categoryItems = items.filter((item) => item.categoryId === id);
  const initialRecommended = pickDailyRecommend(categoryItems);
  const heading = categoryHeading(category.label);

  // JSON-LD：ItemList（前 20 条）+ 面包屑，供搜索结果增强展现
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: heading,
        description: `${category.label}精选合集`,
        numberOfItems: categoryItems.length,
        itemListElement: categoryItems.slice(0, 20).map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.title,
          url: `${settings.site_url}/copy/${item.id}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "首页",
            item: settings.site_url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: category.label,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LibraryShell
        items={items}
        categories={categories}
        initialRecommended={initialRecommended}
        isLoggedIn={!!user}
        userNickname={user?.nickname ?? ""}
        hotItems={hotItems}
        initialCategoryId={id}
        seed={randomUUID()
          .split("-")
          .reduce((acc, part) => (acc ^ parseInt(part, 16)) >>> 0, 0)}
        footer={<SiteFooter />}
      />
    </>
  );
}
