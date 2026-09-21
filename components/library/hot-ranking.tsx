"use client";

import { Flame, Star } from "lucide-react";

import type { TopFavoritedItem } from "@/lib/copywriting-data";

/** 首页热门收藏榜 TOP 5，紧凑横向卡片 */
export function HotRanking({
  items,
  onSelect,
}: {
  items: TopFavoritedItem[];
  onSelect?: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-rose-500 text-white">
          <Flame className="size-4" />
        </span>
        <h2 className="text-sm font-semibold">热门收藏榜</h2>
        <span className="text-xs text-muted-foreground">大家都在收藏</span>
      </div>
      <ol className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect?.(item.id)}
              className="flex w-full cursor-pointer min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent"
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                  i < 3
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.categoryColor }}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {item.title}
              </span>
              <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                <Star className="size-3" />
                {item.favCount}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
