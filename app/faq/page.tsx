import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, HelpCircle } from "lucide-react";

import { JsonLd } from "@/components/seo/json-ld";
import { getCategories, getCategoryCounts } from "@/lib/copywriting-data";
import { categoryFaqItems } from "@/components/library/category-hero";
import {
  breadcrumbJsonLd,
  buildSeoMetadata,
  faqPageJsonLd,
  getSeoContext,
  websiteJsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

/** 站点级 FAQ（FAQ 中心页；分类页只做局部 FAQ，详情页不机械复制） */
const SITE_FAQ: { question: string; answer: string }[] = [
  {
    question: "这个网站是做什么的？",
    answer:
      "这是一个文案素材网站，汇集朋友圈、短视频、小红书、电商、海报、活动宣传等分类的海量精选文案，支持关键词搜索、收藏与一键复制，帮你轻松搞定各类写作与表达。",
  },
  {
    question: "站内文案怎么用？",
    answer:
      "浏览分类或搜索找到喜欢的文案，点击卡片上的复制按钮即可复制到剪贴板，粘贴到朋友圈、短视频脚本、商品详情等任何需要的地方。",
  },
  {
    question: "文案可以免费使用或商用吗？",
    answer:
      "站内文案供个人学习与日常表达参考免费使用。如需商用、转载或二创发布，请注意原文原作者版权，并遵守对应平台的社区规范，必要时联系原作者获取授权。",
  },
  {
    question: "如何投稿文案？",
    answer:
      "注册并登录后，点击页面上的「投稿」按钮，填写标题与正文并选择分类即可提交。投稿会经过关键词与 AI 审核，通过后展示在对应分类下。",
  },
  {
    question: "投稿后多久能通过审核？",
    answer:
      "投稿会先经过系统关键词机审，再结合 AI 辅助审核；正常情况一般在 24 小时内完成，你可以在个人中心查看审核状态与原因。",
  },
  {
    question: "如何收藏喜欢的文案？",
    answer:
      "登录后点击文案卡片上的收藏图标即可收藏，之后在个人中心的「我的收藏」中随时查看。",
  },
  {
    question: "想删除自己投稿的文案怎么办？",
    answer:
      "在个人中心「我的投稿」中选择删除即可进入回收站，冷静期内可恢复；已被较多用户收藏的优质文案受社区保护，不能单方面删除，避免收藏失效。",
  },
  {
    question: "如何反馈问题或联系站长？",
    answer:
      "登录后在个人中心或用户中心进入「反馈」页提交你的问题、建议或投诉，我们会尽快处理。",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    title: "常见问题 FAQ",
    description:
      "关于文案使用、免费与商用、投稿审核、收藏、删除与反馈的常见问题解答。",
    path: "/faq",
    type: "website",
  });
}

export default async function FaqPage() {
  const [categories, categoryCounts, seo] = await Promise.all([
    getCategories(),
    getCategoryCounts(),
    getSeoContext(),
  ]);
  const { siteUrl } = seo;

  // 分类 FAQ 索引：每个分类取一条代表问题 + 链接到分类页局部 FAQ
  const categoryIndex = categories.map((c) => ({
    category: c,
    count: categoryCounts.find((cc) => cc.id === c.id)?.count ?? 0,
    question: categoryFaqItems(c.label)[0]?.question ?? "",
  }));

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      websiteJsonLd({
        name: seo.siteName,
        description: seo.settings.seo_description,
        siteUrl: siteUrl || undefined,
      }),
      faqPageJsonLd({ mainEntity: SITE_FAQ }),
      breadcrumbJsonLd(
        [{ name: "首页", path: "/" }, { name: "常见问题" }],
        siteUrl
      ),
    ],
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
          <Link href="/" className="text-lg font-bold tracking-tight">
            {seo.siteName}
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            返回首页
            <ChevronRight className="ml-0.5 inline size-3.5" />
          </Link>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
          {/* 面包屑 */}
          <nav
            aria-label="面包屑"
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground">
              首页
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground/70">常见问题</span>
          </nav>

          <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <HelpCircle className="size-6 text-cyan-500" />
            常见问题 FAQ
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            关于文案使用、投稿审核、账号与反馈的常见问题解答；每个分类还有各自的局部 FAQ。
          </p>

          {/* 站点级 FAQ */}
          <div className="mt-6 divide-y rounded-2xl border bg-card">
            {SITE_FAQ.map((item) => (
              <details key={item.question} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>

          {/* 分类 FAQ 索引 */}
          {categoryIndex.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-bold tracking-tight">
                分类常见问题
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                每个分类页也内置了对应的局部 FAQ，点击进入即可查看。
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {categoryIndex.map(({ category, count, question }) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.id}#faq`}
                    className="flex flex-col gap-1 rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.label}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {count} 条
                      </span>
                    </span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {question}
                    </span>
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
