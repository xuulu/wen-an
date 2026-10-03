import Link from "next/link";
import { ChevronRight, Flame, LayoutGrid } from "lucide-react";

import type { Category } from "@/lib/copywriting";
import type { TopFavoritedItem } from "@/lib/copywriting-data";

/**
 * 首页 SEO 内容区块（服务端组件，放在跑马灯与文案列表之间）：
 * - 一句话说明网站是什么（h2 语义块，配合 WebSite JSON-LD）
 * - 主要分类导航（名称 + 简介 + 数量，真实链接）
 * - 热门文案 TOP（真实内容入口）
 * 让搜索引擎与用户一眼明白：这是什么站、有哪些分类、热门内容在哪。
 */

export function HomeSeoSection({
  siteName,
  description,
  categories,
  hotItems,
}: {
  siteName: string;
  description: string;
  categories: { category: Category; count: number }[];
  hotItems: TopFavoritedItem[];
}) {
  return (
    <section className="border-b bg-background" aria-label="网站分类与热门内容">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* 网站是什么 */}
        <div className="max-w-3xl">
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">
            {siteName}是什么？
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {description || `${siteName}是一个文案素材网站，提供各分类精选文案的搜索、收藏与一键复制。`}
          </p>
        </div>

        {/* 主要分类导航 */}
        {categories.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center gap-2">
              <LayoutGrid className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">主要分类</h3>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map(({ category, count }) => (
                <Link
                  key={category.id}
                  href={`/category/${category.id}`}
                  className="group flex flex-col gap-1 rounded-xl border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.label}
                    <ChevronRight className="ml-auto size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {category.description?.trim() || `${count} 条精选文案`}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {count} 条内容
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 热门内容入口 */}
        {hotItems.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold">热门文案</h3>
            </div>
            <ul className="mt-3 grid gap-1 sm:grid-cols-2">
              {hotItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/copy/${item.id}`}
                    className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.categoryColor }}
                    />
                    <span className="truncate">{item.title}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-amber-500">
                      🔥 {item.favCount}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
