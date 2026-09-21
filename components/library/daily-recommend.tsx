"use client";

import { Check, Copy, RefreshCw, Sparkles, Star } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getCategoryStyle, type Category, type CopyItem } from "@/lib/copywriting";

interface DailyRecommendProps {
  items: CopyItem[];
  categories: Category[];
  initialRecommended: CopyItem | null;
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
}

function pickRandom(
  items: CopyItem[],
  currentId: string | null
): CopyItem {
  if (items.length === 0) return null as unknown as CopyItem;
  if (items.length === 1) return items[0];
  let next = items[Math.floor(Math.random() * items.length)];
  // 避免连续重复同一篇
  let guard = 0;
  while (next.id === currentId && guard < 10) {
    next = items[Math.floor(Math.random() * items.length)];
    guard += 1;
  }
  return next;
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

export function DailyRecommend({
  items,
  categories,
  initialRecommended,
  favoriteIds,
  onToggleFavorite,
}: DailyRecommendProps) {
  const [recommended, setRecommended] = useState<CopyItem | null>(
    initialRecommended
  );
  const [copied, setCopied] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const category = recommended
    ? categories.find((c) => c.id === recommended.categoryId)
    : undefined;
  const style = category ? getCategoryStyle(category.color) : null;

  function handleRefresh() {
    if (spinning || items.length === 0) return;
    setSpinning(true);
    setRecommended((prev) => pickRandom(items, prev?.id ?? null));
    window.setTimeout(() => setSpinning(false), 500);
  }

  async function handleCopy() {
    if (!recommended) return;
    await copyText(recommended.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (!recommended) return null;

  return (
    <section className="rounded-2xl bg-card p-3 ring-1 ring-foreground/[0.07]">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-rose-500 text-white">
          <Sparkles className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-semibold">每日推荐</span>
            <h3 className="min-w-0 truncate text-sm font-medium">
              {recommended.title}
            </h3>
            {style && (
              <span
                className="hidden shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium sm:inline-flex"
                style={style.badge}
              >
                {category?.label}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {recommended.content}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="换一条"
            onClick={handleRefresh}
            disabled={spinning}
          >
            <RefreshCw
              className={spinning ? "animate-spin" : undefined}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              favoriteIds.has(recommended.id) ? "取消收藏" : "收藏"
            }
            onClick={() => onToggleFavorite(recommended.id)}
          >
            <Star
              className={
                favoriteIds.has(recommended.id)
                  ? "fill-amber-400 text-amber-400"
                  : undefined
              }
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="复制"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="text-emerald-600" />
            ) : (
              <Copy />
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
