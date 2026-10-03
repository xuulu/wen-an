import Link from "next/link";
import { ChevronRight, LayoutGrid } from "lucide-react";

import type { Category } from "@/lib/copywriting";

/**
 * 首页 SEO 内容区块（服务端组件，放在跑马灯与文案列表之间）：
 * - 一句话网站简介（后台 seo_description，配合 WebSite JSON-LD）
 * - 主要分类导航（名称 + 简介 + 数量徽标，真实链接）
 * 热门/最新内容入口由列表区的「热门收藏榜 / 每日推荐」承担，这里不做重复展示。
 */

export function HomeSeoSection({
  siteName,
  description,
  categories,
}: {
  siteName: string;
  description: string;
  categories: { category: Category; count: number }[];
}) {
  const intro =
    description ||
    `${siteName}是一个文案素材网站，提供各分类精选文案的搜索、收藏与一键复制。`;

  return (
    <section className="border-b bg-background" aria-label="网站简介与主要分类">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-1.5 shrink-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" />
          <p className="truncate">{intro}</p>
        </div>

        {categories.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">主要分类</h2>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {categories.map(({ category, count }) => (
                <Link
                  key={category.id}
                  href={`/category/${category.id}`}
                  className="group relative flex min-h-24 flex-col justify-between gap-2 overflow-hidden rounded-xl border bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:ring-1 hover:ring-foreground/15"
                >
                  {/* 左侧类目色竖条 */}
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 h-full w-1"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="flex items-center gap-1.5 pl-2 text-sm font-medium">
                    {category.label}
                    <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="line-clamp-1 pl-2 text-xs text-muted-foreground">
                    {category.description?.trim() || "精选文案合集"}
                  </span>
                  <span className="pl-2 text-[11px] text-muted-foreground/70">
                    {count} 条文案
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
