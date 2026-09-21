"use client";

import { ChevronLeft, ChevronRight, PenLine, Search, SearchX, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppSidebar } from "@/components/library/app-sidebar";
import { CopyCard } from "@/components/library/copy-card";
import { CopyFormSheet } from "@/components/library/copy-form-sheet";
import { DailyRecommend } from "@/components/library/daily-recommend";
import { HotRanking } from "@/components/library/hot-ranking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { TopFavoritedItem } from "@/lib/copywriting-data";
import type { Category, CopyItem } from "@/lib/copywriting";

interface LibraryShellProps {
  items: CopyItem[];
  categories: Category[];
  initialRecommended: CopyItem | null;
  isLoggedIn: boolean;
  userNickname: string;
  hotItems: TopFavoritedItem[];
  /** 服务端每次请求生成的随机种子（F5 重新请求即换种子） */
  seed: number;
  /** 页脚（服务端组件，由页面传入） */
  footer?: React.ReactNode;
}

/** 首页网格每页条数（客户端分页） */
const PAGE_SIZE = 50;

/** mulberry32 种子化 PRNG：同种子序列可复现，不同种子序列不同 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 基于种子的 Fisher–Yates 洗牌 */
function shuffleStable<T>(list: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const next = list.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/** 分页跳页输入：输入页码回车跳转 */
function PageJump({
  totalPages,
  onJump,
}: {
  totalPages: number;
  onJump: (page: number) => void;
}) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      跳到
      <input
        type="number"
        min={1}
        max={totalPages}
        aria-label="跳转页码"
        className="h-8 w-16 rounded-md border border-input bg-background px-2 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const value = Number((e.target as HTMLInputElement).value);
            if (value >= 1 && value <= totalPages) onJump(value);
          }
        }}
      />
      页
    </span>
  );
}

/** 简单字符串哈希（用于区分各分类的随机序列） */
function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function LibraryShell({
  items,
  categories,
  initialRecommended,
  isLoggedIn,
  userNickname,
  hotItems,
  seed,
  footer,
}: LibraryShellProps) {
  const router = useRouter();
  const [activeId, setActiveId] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(items.filter((item) => item.favorite).map((item) => item.id))
  );
  const [hotFilterId, setHotFilterId] = useState<string | null>(null);
  // 本地文案列表：投稿新建后立即插入，实时刷新，不必等整页重载
  const [localItems, setLocalItems] = useState<CopyItem[]>(items);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const sidebarCategories = useMemo(
    () =>
      categories.map((category) => ({
        id: category.id,
        label: category.label,
        color: category.color,
        count: localItems.filter((item) => item.categoryId === category.id).length,
      })),
    [categories, localItems]
  );

  const visibleItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return localItems.filter((item) => {
      if (hotFilterId && item.id !== hotFilterId) return false;
      if (activeId === "favorites" && !favoriteIds.has(item.id)) return false;
      if (
        activeId !== "all" &&
        activeId !== "favorites" &&
        item.categoryId !== activeId
      )
        return false;
      if (!keyword) return true;
      return (
        item.title.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword) ||
        item.tags.some((tag) => tag.toLowerCase().includes(keyword))
      );
    });
  }, [activeId, favoriteIds, hotFilterId, localItems, query]);

  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  // 每次进入该视图（全部或某分类）时洗牌，翻页顺序稳定；刷新页面/切换分类重新随机
  // 每个视图（全部/某分类）用不同种子：基础种子叠加视图 id 哈希，翻页顺序稳定
  const shuffledItems = useMemo(
    () => shuffleStable(visibleItems, seed ^ hashString(activeId)),
    [visibleItems, seed, activeId]
  );
  const pagedItems = useMemo(
    () => shuffledItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [shuffledItems, safePage]
  );

  const activeLabel = hotFilterId
    ? "热门文案"
    : activeId === "all"
      ? "全部文案"
      : activeId === "favorites"
        ? "我的收藏"
        : categoryMap.get(activeId)?.label ?? "全部文案";

  function handleSelectCategory(id: string) {
    setActiveId(id);
    setPage(1);
  }

  /** 点击热门收藏榜：只过滤出该条文案 */
  function handleHotSelect(id: string) {
    setHotFilterId(id);
    setPage(1);
  }

  function clearHotFilter() {
    setHotFilterId(null);
    setPage(1);
  }

  function handleContribute() {
    if (isLoggedIn) setNewSheetOpen(true);
    else router.push("/user/login");
  }

  /** 投稿成功：插入列表顶部并跳到全部视图，实时可见（待审文案仍标注状态） */
  function handleItemSaved(newItem: CopyItem) {
    setLocalItems((prev) =>
      prev.some((item) => item.id === newItem.id) ? prev : [newItem, ...prev]
    );
    setHotFilterId(null);
    setQuery("");
    setActiveId("all");
    setPage(1);
  }

  async function toggleFavorite(id: string) {
    if (!isLoggedIn) {
      router.push("/user/login");
      return;
    }

    const willFavorite = !favoriteIds.has(id);

    // 乐观更新：先改 UI
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
          {
            method: "DELETE",
          }
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

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          activeId={activeId}
          totalCount={localItems.length}
          favoriteCount={favoriteIds.size}
          categories={sidebarCategories}
          onSelect={handleSelectCategory}
          isLoggedIn={isLoggedIn}
          userNickname={userNickname}
        />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:gap-3 sm:px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-0 h-4 sm:mr-1" />
            <div className="relative min-w-0 flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="搜索标题、内容或标签…"
                className="h-9 pl-8"
              />
            </div>
            <Button
              size="lg"
              className="hidden bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 sm:inline-flex"
              onClick={handleContribute}
            >
              <PenLine />
              投稿文案
            </Button>
            <Button
              size="icon-lg"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 sm:hidden"
              aria-label="投稿文案"
              onClick={handleContribute}
            >
              <PenLine />
            </Button>
          </header>
          <main className="relative flex-1 p-3 [background-image:radial-gradient(55%_38%_at_50%_-8%,oklch(0.68_0.16_245/0.10),transparent_70%)] sm:p-4 lg:p-6">
            <div className="mx-auto flex max-w-7xl flex-col gap-4">
              <DailyRecommend
                items={localItems}
                categories={categories}
                initialRecommended={initialRecommended}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
              />

              <HotRanking items={hotItems} onSelect={handleHotSelect} />

              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h1 className="font-heading text-2xl font-semibold tracking-tight">
                    {activeLabel}
                  </h1>
                  <p className="font-mono text-xs text-muted-foreground">
                    {visibleItems.length} ITEMS
                  </p>
                </div>
                {hotFilterId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearHotFilter}
                  >
                    <X />
                    返回全部文案
                  </Button>
                )}
              </div>

              {pagedItems.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
                  {pagedItems.map((item) => {
                    const category = categoryMap.get(item.categoryId);
                    return (
                      <CopyCard
                        key={item.id}
                        item={{ ...item, favorite: favoriteIds.has(item.id) }}
                        categoryLabel={category?.label ?? "未分类"}
                        categoryColor={category?.color ?? "#10b981"}
                        onToggleFavorite={toggleFavorite}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-20 text-center">
                  <SearchX className="size-8 text-muted-foreground" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">没有找到匹配的文案</p>
                    <p className="text-sm text-muted-foreground">
                      换个关键词，或切换到其他分类试试
                    </p>
                  </div>
                  {query && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuery("");
                        setPage(1);
                      }}
                    >
                      清除搜索
                    </Button>
                  )}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft />
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {safePage} / {totalPages} 页
                  </span>
                  <PageJump totalPages={totalPages} onJump={setPage} />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    下一页
                    <ChevronRight />
                  </Button>
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
      <CopyFormSheet
        open={newSheetOpen}
        onOpenChange={setNewSheetOpen}
        categories={categories}
        actionUrl="/api/user/copy"
        submitTitle="投稿文案"
        submitDescription="投稿提交后进入待审核，管理员通过后会展示在首页。"
        onSaved={handleItemSaved}
      />
      {footer}
    </TooltipProvider>
  );
}
