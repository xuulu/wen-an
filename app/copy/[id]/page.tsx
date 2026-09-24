import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Library } from "lucide-react";

import { CopyDetailActions } from "@/components/library/copy-detail-actions";
import { SiteFooter } from "@/components/library/site-footer";
import { getCurrentUser } from "@/lib/auth";
import {
  getCategories,
  getCopyItemById,
  getCopyItems,
} from "@/lib/copywriting-data";
import { getSiteSettings, resolveSiteUrl } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

interface CopyPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: CopyPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getCopyItemById(id);
  if (!item || item.status !== "approved") {
    return { title: "文案不存在", robots: { index: false, follow: false } };
  }
  return {
    title: item.title,
    description: item.content.slice(0, 120),
    alternates: { canonical: `/copy/${id}` },
  };
}

export default async function CopyPage({ params }: CopyPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  const [item, categories, settings] = await Promise.all([
    getCopyItemById(id, user?.id ?? 0),
    getCategories(),
    getSiteSettings(),
  ]);

  if (!item || item.status !== "approved") notFound();

  const category = categories.find((c) => c.id === item.categoryId);

  // 对外域名：后台 site_url → SITE_URL env → 空（绝不输出 localhost）
  const siteUrl = resolveSiteUrl(settings);

  // 同分类推荐，同时作为内链入口帮助爬虫发现更多详情页
  const { items: sameCategory } = await getCopyItems({
    categoryId: item.categoryId,
  });
  const related = sameCategory.filter((other) => other.id !== id).slice(0, 8);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        name: item.title,
        text: item.content,
        ...(siteUrl ? { url: `${siteUrl}/copy/${id}` } : {}),
        datePublished: item.updatedAt,
        dateModified: item.updatedAt,
        keywords: item.tags.join(","),
        articleSection: category?.label,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "首页",
            ...(siteUrl ? { item: siteUrl } : {}),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: category?.label ?? "未分类",
            ...(siteUrl && category
              ? { item: `${siteUrl}/category/${category.id}` }
              : {}),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: item.title,
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

      <div className="min-h-screen">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
              <Library className="size-4" />
            </span>
            <span className="text-sm font-semibold">{settings.site_name}</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            返回首页
            <ChevronRight className="size-4" />
          </Link>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
          {/* 面包屑 */}
          <nav
            aria-label="面包屑"
            className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground">
              首页
            </Link>
            <ChevronRight className="size-3" />
            {category && (
              <>
                <Link
                  href={`/category/${category.id}`}
                  className="hover:text-foreground"
                >
                  {category.label}
                </Link>
                <ChevronRight className="size-3" />
              </>
            )}
            <span className="text-foreground/70">{item.title}</span>
          </nav>

          {/* 正文卡片 */}
          <article className="mt-5 rounded-2xl bg-card p-6 ring-1 ring-foreground/[0.07] sm:p-8">
            <h1 className="text-2xl leading-snug font-bold tracking-tight">
              {item.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
              {category && (
                <>
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <Link
                    href={`/category/${category.id}`}
                    className="hover:text-foreground"
                  >
                    {category.label}
                  </Link>
                  <span className="text-foreground/20">/</span>
                </>
              )}
              <span>{item.updatedAt}</span>
            </div>

            <div className="mt-6 whitespace-pre-wrap text-[15px] leading-loose text-foreground/90">
              {item.content}
            </div>

            {item.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-x-3 font-mono text-xs text-muted-foreground/80">
                {item.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            )}

            <div className="mt-8 border-t pt-6">
              <CopyDetailActions
                copyId={item.id}
                content={item.content}
                initialFavorite={item.favorite}
                isLoggedIn={!!user}
              />
            </div>
          </article>

          {/* 其他推荐 */}
          {related.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold">推荐其他</h2>
              <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                {related.map((other) => (
                  <li key={other.id}>
                    <Link
                      href={`/copy/${other.id}`}
                      className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: categories.find(
                            (c) => c.id === other.categoryId
                          )?.color,
                        }}
                      />
                      <span className="truncate">{other.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
