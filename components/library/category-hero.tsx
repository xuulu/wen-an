import Link from "next/link";
import { ChevronRight, HelpCircle } from "lucide-react";

import type { Category } from "@/lib/copywriting";

/**
 * 分类页 SEO 头部区块（服务端组件）：
 * - H1 分类名（分类着陆页唯一 h1）
 * - 分类简介（后台可填，空则用默认）
 * - 相关分类入口（其余分类，带数量，帮助爬虫发现更多分类页）
 * - 局部 FAQ（details 折叠，配合分类页 FAQPage JSON-LD，不机械复制到详情页）
 */

export function defaultCategoryDescription(label: string): string {
  return `${label}精选合集，每日更新优质${label}模板，支持关键词搜索、收藏与一键复制，快速找到灵感。`;
}

/** 分类页局部 FAQ：问题固定、答案内嵌分类名 */
export function categoryFaqItems(label: string): { question: string; answer: string }[] {
  return [
    {
      question: `${label}文案有哪些用途？`,
      answer: `站内${label}文案适用于朋友圈、短视频、小红书、节日祝福等常见场景，找到喜欢的直接复制即可使用。`,
    },
    {
      question: `这里的${label}文案可以免费使用吗？`,
      answer: `站内文案供个人学习与日常表达参考使用；如需商用或转载，请注意原作者版权并遵守对应平台的社区规范。`,
    },
    {
      question: `如何投稿${label}文案？`,
      answer: `注册并登录后点击「投稿」，填写标题与正文内容，审核通过后即可展示在${label}分类下，与大家分享。`,
    },
    {
      question: `如何快速找到更多${label}文案？`,
      answer: `可以在顶部搜索框输入关键词，或在左侧分类列表中切换到其他分类浏览更多文案。`,
    },
  ];
}

export function CategoryHero({
  category,
  description,
  count,
  related,
}: {
  category: Category;
  description: string;
  count: number;
  /** 相关分类（不含当前分类） */
  related: { category: Category; count: number }[];
}) {
  const faqItems = categoryFaqItems(category.label);

  return (
    <section className="border-b bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        {/* 面包屑（分类页） */}
        <nav
          aria-label="面包屑"
          className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground"
        >
          <Link href="/" className="hover:text-foreground">
            首页
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground/70">{category.label}</span>
        </nav>

        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {category.label}
          </h1>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {count} 条
          </span>
        </div>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        {/* 相关分类入口 */}
        {related.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="shrink-0 text-xs text-muted-foreground">
              相关分类：
            </span>
            {related.map(({ category: other, count: c }) => (
              <Link
                key={other.id}
                href={`/category/${other.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:bg-accent"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: other.color }}
                />
                {other.label}
                <span className="text-muted-foreground/60">{c}</span>
              </Link>
            ))}
          </div>
        )}

        {/* 局部 FAQ（分类页专属，非详情页机械复制）；id 供 FAQ 中心页锚点跳转 */}
        <details
          id="faq"
          className="group mt-4 max-w-3xl rounded-xl border bg-card"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <HelpCircle className="size-4 text-muted-foreground" />
            关于{category.label}的常见问题
            <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <div className="divide-y border-t">
            {faqItems.map((item) => (
              <div key={item.question} className="px-4 py-3">
                <p className="text-sm font-medium">{item.question}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
