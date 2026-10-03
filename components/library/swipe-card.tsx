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

/**
 * 探探风格大卡片：分类徽章 + 标题 + 正文 + 日期 + 复制，
 * 视觉中心是正文，卡片内滚动兜底长文案。
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

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl shadow-black/10"
      data-testid="swipe-card"
    >
      {/* 分类色顶区渐变 */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b"
        style={{
          background: `linear-gradient(to bottom, ${categoryColor}26, transparent)`,
        }}
      />

      <div className="flex items-center gap-2 px-5 pt-5">
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
      <h2 className="mt-3 px-5 text-xl leading-snug font-bold tracking-tight">
        <Link
          href={`/copy/${item.id}`}
          className="rounded-sm outline-none decoration-cyan-500/60 decoration-1 underline-offset-2 transition-colors hover:text-cyan-700 hover:underline focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-cyan-300"
        >
          {item.title}
        </Link>
      </h2>

      {/* 正文：溢出滚动，保持卡片内可读 */}
      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <p className="mx-5 flex-1 overflow-y-auto text-[15px] leading-7 text-muted-foreground [scrollbar-width:thin]">
          {item.content}
        </p>
      </div>

      {/* 底部操作：复制 + 详情 */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 px-5 py-4">
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
