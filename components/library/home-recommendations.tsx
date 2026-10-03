"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Category, CopyItem } from "@/lib/copywriting";
import type { TopFavoritedItem } from "@/lib/copywriting-data";

// ---- 分包懒加载（Web Vitals：首屏下方内容，独立 chunk，不影响 LCP 关键元素）----
const DailyRecommend = dynamic(
  () =>
    import("@/components/library/daily-recommend").then(
      (m) => m.DailyRecommend
    ),
  { ssr: true, loading: () => <div className="h-28" aria-hidden /> }
);
const HotRanking = dynamic(
  () => import("@/components/library/hot-ranking").then((m) => m.HotRanking),
  { ssr: true, loading: () => <div className="h-20" aria-hidden /> }
);

interface HomeRecommendationsProps {
  /** 当前列表数据（用于「换一条」随机与初始收藏态） */
  items: CopyItem[];
  categories: Category[];
  initialRecommended: CopyItem | null;
  hotItems: TopFavoritedItem[];
  isLoggedIn: boolean;
}

/**
 * 首页专属推荐区（每日推荐 + 热门收藏榜）。
 * 仅首页 page 使用，不进入共用布局组件：分类页等其余页面天然不显示。
 * 收藏逻辑独立维护（与列表卡片各自乐观更新，刷新后一致）。
 */
export function HomeRecommendations({
  items,
  categories,
  initialRecommended,
  hotItems,
  isLoggedIn,
}: HomeRecommendationsProps) {
  const router = useRouter();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(items.filter((item) => item.favorite).map((item) => item.id))
  );

  async function toggleFavorite(id: string) {
    if (!isLoggedIn) {
      router.push("/user/login");
      return;
    }
    const willFavorite = !favoriteIds.has(id);

    // 乐观更新：先改 UI，失败回滚
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (willFavorite) next.add(id);
      else next.delete(id);
      return next;
    });

    try {
      if (willFavorite) {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ copyId: id }),
        });
        if (!res.ok) throw new Error("收藏失败");
      } else {
        const res = await fetch(
          `/api/favorites?copyId=${encodeURIComponent(id)}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("取消收藏失败");
      }
    } catch {
      // 失败回滚
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (willFavorite) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  }

  function handleHotSelect(id: string) {
    router.push(`/copy/${id}`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DailyRecommend
        items={items}
        categories={categories}
        initialRecommended={initialRecommended}
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleFavorite}
      />

      <HotRanking items={hotItems} onSelect={handleHotSelect} />
    </div>
  );
}
