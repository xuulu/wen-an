import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Library } from "lucide-react";

import { CopyDetailActions } from "@/components/library/copy-detail-actions";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentUser } from "@/lib/auth";
import {
  getCategories,
  getCopyItemById,
  getCopyItems,
  getTopFavorited,
} from "@/lib/copywriting-data";
import {
  breadcrumbJsonLd,
  buildSeoMetadata,
  creativeWorkJsonLd,
  getSeoContext,
  websiteJsonLd,
} from "@/lib/seo";

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
  return buildSeoMetadata({
    title: item.title,
    description: item.content.slice(0, 160),
    path: `/copy/${id}`,
    type: "article",
  });
}

export default async function CopyPage({ params }: CopyPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  const [item, categories] = await Promise.all([
    getCopyItemById(id, user?.id ?? 0),
    getCategories(),
  ]);

  if (!item || item.status !== "approved") notFound();

  const category = categories.find((c) => c.id === item.categoryId);

  // 对外域名：后台 site_url → SITE_URL env → 空（绝不输出 localhost）
  const seo = await getSeoContext();
  const { siteUrl } = seo;

  // 同分类推荐 4 条，同时作为内链入口帮助爬虫发现更多详情页
  const { items: sameCategory } = await getCopyItems({
    categoryId: item.categoryId,
  });
  const related = sameCategory.filter((other) => other.id !== id).slice(0, 4);
  // 其他分类热门 2 条（多层入口：让一篇内容可从多个相关分类/专题进入，总量控制在 6 个左右）
  const hotItems = (await getTopFavorited(10, true))
    .filter((h) => h.id !== id && h.categoryId !== item.categoryId)
    .slice(0, 2);
  // 其他分类入口（详情页底部「相关分类」，发现更多分类专题）
  const relatedCategories = categories
    .filter((c) => c.id !== item.categoryId)
    .slice(0, 8);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      websiteJsonLd({
        name: seo.siteName,
        description: seo.settings.seo_description,
        siteUrl: siteUrl || undefined,
      }),
      creativeWorkJsonLd({
        title: item.title,
        content: item.content,
        path: `/copy/${id}`,
        siteUrl,
        datePublished: item.createdAt ?? item.updatedAt,
        dateModified: item.updatedAt,
        category: category?.label,
      }),
      breadcrumbJsonLd(
        [
          { name: "首页", path: "/" },
          ...(category ? [{ name: category.label, path: `/category/${category.id}` }] : []),
          { name: item.title },
        ],
        siteUrl
      ),
    ],
  };

  return (
    <>
      <JsonLd data={structuredData} />

      <div className="min-h-screen">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
              <Library className="size-4" />
            </span>
            <span className="text-sm font-semibold">{seo.siteName}</span>
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
            <h1 className="text-2xl leading-snug font-bold tracking-tight sm:text-3xl">
              {item.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
              {category && (
                <>
                  <Link
                    href={`/category/${category.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 transition-colors hover:bg-accent"
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.label}
                  </Link>
                  <span className="text-foreground/20">/</span>
                </>
              )}
              <time dateTime={item.createdAt ?? item.updatedAt}>
                发布于 {item.createdAt ?? item.updatedAt}
              </time>
              {item.updatedAt !== (item.createdAt ?? item.updatedAt) && (
                <>
                  <span className="text-foreground/20">/</span>
                  <time dateTime={item.updatedAt}>更新于 {item.updatedAt}</time>
                </>
              )}
            </div>

            <div className="mt-6 whitespace-pre-wrap text-[15px] leading-loose text-foreground/90 sm:text-base">
              {item.content}
            </div>

            {/* 署名：仅用户投稿时在正文右下角显示，公共文案留空 */}
            {item.authorId && (
              <p className="mt-4 text-right font-mono text-xs text-muted-foreground/60">
                - 投稿人：{item.authorName}
              </p>
            )}

            <div className="mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                觉得不错就复制收藏，方便下次使用
              </p>
              <CopyDetailActions
                copyId={item.id}
                content={item.content}
                initialFavorite={item.favorite}
                isLoggedIn={!!user}
              />
            </div>
          </article>

          {/* 相关推荐：同分类优先 + 其他分类热门（多层入口） */}
          {(related.length > 0 || hotItems.length > 0) && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold">相关推荐</h2>
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
                {hotItems.map((other) => (
                  <li key={other.id}>
                    <Link
                      href={`/copy/${other.id}`}
                      className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: other.categoryColor }}
                      />
                      <span className="truncate">{other.title}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-amber-500">
                        🔥 {other.favCount}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 相关分类专题入口 */}
          {relatedCategories.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold">浏览其他分类</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {relatedCategories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/category/${c.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-accent"
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.label}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

      </div>
    </>
  );
}
