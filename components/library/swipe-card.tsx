"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { CopyItem } from "@/lib/copywriting";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/** 正文自适应字号：短文案大字居中更优雅，长文案小字保证可读 */
function bodyFontSize(len: number): number {
  if (len < 18) return 24;
  if (len < 40) return 20;
  if (len < 80) return 17;
  if (len < 140) return 15;
  return 14;
}

/**
 * 探探风格大卡片（黄金比例 3:4，高度上限 70dvh）：
 * 分类徽章 + 标题 + 正文（垂直居中 + 字号自适应）+ 复制/详情。
 */
export function SwipeCard({
  item,
  categoryLabel,
  categoryColor,
}: {
  item: CopyItem;
  categoryLabel: string;
  categoryColor: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    await copyText(item.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const fontSize = bodyFontSize(item.content.length);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl shadow-black/10"
      data-testid="swipe-card"
    >
      {/* 分类色顶区渐变 */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b"
        style={{
          background: `linear-gradient(to bottom, ${categoryColor}26, transparent)`,
        }}
      />

      <div className="flex items-center gap-2 px-5 pt-4">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: categoryColor }}
        />
        <span className="truncate font-mono text-xs text-muted-foreground">
          {categoryLabel}
        </span>
        {item.authorName && (
          <span className="shrink-0 truncate text-xs text-muted-foreground/70">
            · {item.authorName}
          </span>
        )}
        <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground/60">
          {item.updatedAt}
        </span>
      </div>

      {/* 标题：点击进详情 */}
      <h2 className="mt-2.5 px-5 text-xl leading-snug font-bold tracking-tight">
        <Link
          href={`/copy/${item.id}`}
          className="rounded-sm outline-none decoration-cyan-500/60 decoration-1 underline-offset-2 transition-colors hover:text-cyan-700 hover:underline focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-cyan-300"
        >
          {item.title}
        </Link>
      </h2>

      {/* 正文：垂直居中 + 字号自适应，短文案不显得空旷 */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-4">
        <p
          className="max-h-full overflow-y-auto text-center leading-relaxed text-muted-foreground [scrollbar-width:thin]"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
        >
          {item.content}
        </p>
      </div>

      {/* 底部操作：复制 + 详情 */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3.5">
        <Link
          href={`/copy/${item.id}`}
          className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-cyan-700 hover:underline dark:hover:text-cyan-300"
        >
          查看详情
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0 rounded-full px-4 text-xs font-medium text-muted-foreground ring-1 ring-foreground/10 transition-colors hover:border-cyan-600/30 hover:bg-cyan-500/5 hover:text-cyan-700 hover:ring-cyan-600/30 dark:hover:text-cyan-300 data-[copied=true]:border-emerald-600/30 data-[copied=true]:text-emerald-600 data-[copied=true]:ring-emerald-600/30"
          data-copied={copied}
          onClick={handleCopy}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "已复制" : "复制"}
        </Button>
      </div>
    </div>
  );
}
