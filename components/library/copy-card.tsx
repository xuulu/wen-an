"use client";

import { Check, Copy, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CopyItem } from "@/lib/copywriting";

interface CopyCardProps {
  item: CopyItem;
  categoryLabel: string;
  categoryColor: string;
  onToggleFavorite: (id: string) => void;
}

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

export function CopyCard({
  item,
  categoryLabel,
  categoryColor,
  onToggleFavorite,
}: CopyCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copyText(item.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card className="group/card relative h-full gap-0 rounded-2xl p-5 ring-foreground/[0.07] transition-all duration-300 hover:-translate-y-1 hover:ring-foreground/20 hover:shadow-[0_12px_32px_-12px_oklch(0.4_0.05_250/0.18)]">
      {/* hover 时浮现的类目色光晕 */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover/card:opacity-100"
        style={{
          background: `radial-gradient(circle, ${categoryColor}2e, transparent 70%)`,
        }}
      />

      {/* 元信息行：类目 · 日期 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: categoryColor }}
          />
          <span className="truncate">{categoryLabel}</span>
          <span className="text-foreground/20">/</span>
          <span className="shrink-0">{item.updatedAt}</span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={item.favorite ? "取消收藏" : "收藏"}
          className="size-7 shrink-0 text-muted-foreground/60 hover:text-foreground data-[fav=true]:text-amber-500"
          data-fav={item.favorite}
          onClick={() => onToggleFavorite(item.id)}
        >
          <Star
            className={
              item.favorite
                ? "size-4 fill-amber-400 text-amber-400"
                : "size-4"
            }
          />
        </Button>
      </div>

      {/* 标题 */}
      <h3 className="mt-3 line-clamp-2 text-[15px] leading-snug font-semibold tracking-tight">
        <Link
          href={`/copy/${item.id}`}
          className="rounded-sm outline-none transition-colors hover:text-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {item.title}
        </Link>
      </h3>

      {/* 正文 */}
      <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-muted-foreground">
        {item.content}
      </p>

      {/* 底部：标签 + 复制 */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-muted-foreground/80">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 rounded-full border-0 px-3 text-xs font-medium text-muted-foreground ring-1 ring-foreground/10 hover:text-foreground hover:ring-foreground/25 data-[copied=true]:text-emerald-600 data-[copied=true]:ring-emerald-600/30"
          data-copied={copied}
          onClick={handleCopy}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "已复制" : "复制"}
        </Button>
      </div>
    </Card>
  );
}
