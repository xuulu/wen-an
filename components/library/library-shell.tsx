"use client";

import { ChevronLeft, ChevronRight, PenLine, Search, SearchX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  /** 服务端返回的第一页文案（后续翻页经 /api/copy 服务端加载） */
  initialItems: CopyItem[];
  /** 当前视图总条数（服务端 COUNT） */
  total: number;
  categories: Category[];
  /** 各分类已上架数量（服务端聚合） */
  categoryCounts: { id: string; count: number }[];
  /** 当前用户收藏数（服务端聚合，未登录为 0） */
  favoritesCount: number;
  initialRecommended: CopyItem | null;
  isLoggedIn: boolean;
  userNickname: string;
  hotItems: TopFavoritedItem[];
  /** 服务端生成的随机种子：同种子分页顺序稳定，F5 重新随机 */
  randomSeed: number;
  /** 排序模式（与服务端一致）：random / updated */
  sortMode?: "random" | "updated";
  /** 进入时默认选中的分类（/category/[id] 页传入；首页为 all） */
  initialCategoryId?: string;
  /** 初始搜索词（来自 URL ?q=，如 404 页搜索框跳转） */
  initialQuery?: string;
  /** 页脚（服务端组件，由页面传入） */
  footer?: React.ReactNode;
}

/** 服务端分页页大小（与页面文件一致） */
const PAGE_SIZE = 50;

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

export function LibraryShell({
  initialItems,
  total: initialTotal,
  categories,
  categoryCounts,
  favoritesCount: initialFavoritesCount,
  initialRecommended,
  isLoggedIn,
  userNickname,
  hotItems,
  randomSeed,
  sortMode = "random",
  initialCategoryId = "all",
  initialQuery = "",
  footer,
}: LibraryShellProps) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(initialCategoryId);
  // 路由标识：客户端 Link 在分类页之间跳转时组件实例不会重建，
  // 通过 render 阶段比对把外部 prop 变化同步进 state（不用 effect，避免 setState-in-effect）
  const [routeCategory, setRouteCategory] = useState(initialCategoryId);
  const [query, setQuery] = useState(initialQuery);
  // 防抖后的搜索词（触发服务端加载）
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [localItems, setLocalItems] = useState<CopyItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(initialItems.filter((item) => item.favorite).map((item) => item.id))
  );
  const [favoritesCount, setFavoritesCount] = useState(initialFavoritesCount);
  // 请求竞态保护：只接受最新一次请求的结果
  const requestSeq = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 首次挂载：SSR 已渲染第一页，跳过初始请求
  const firstRender = useRef(true);

  if (routeCategory !== initialCategoryId) {
    setRouteCategory(initialCategoryId);
    setActiveId(initialCategoryId);
    setPage(1);
  }
  // URL 搜索词同步：404 页搜索框跳转 /?q= 后，把服务端传来的初始词同步进 state
  if (routeCategory === initialCategoryId && initialQuery && query !== initialQuery) {
    setQuery(initialQuery);
    setDebouncedQuery(initialQuery);
  }

  /** 服务端加载一页：视图(分类/收藏/全部) + 搜索 + 种子排序 全部在数据库完成 */
  async function loadPage(
    targetPage: number,
    viewId: string,
    keyword: string
  ) {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(PAGE_SIZE),
        categoryId: viewId,
        seed: String(randomSeed),
        sort: sortMode,
      });
      if (keyword.trim()) params.set("search", keyword.trim());
      const res = await fetch(`/api/copy?${params.toString()}`);
      const data = (await res.json()) as { items: CopyItem[]; total: number };
      if (seq !== requestSeq.current) return; // 过期响应丢弃
      setLocalItems(data.items);
      setTotal(data.total);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }

  // 搜索防抖 300ms 后服务端加载（回第 1 页）
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  // 防抖搜索词变化 → 回第 1 页服务端加载（SSR 已带初始词渲染时跳过）
  useEffect(() => {
    if (firstRender.current && debouncedQuery === initialQuery) return;
    setPage(1);
    loadPage(1, activeId, debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // 页码变化 → 服务端加载（首次挂载由 SSR 提供，跳过）
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    loadPage(page, activeId, debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
        count:
          categoryCounts.find((c) => c.id === category.id)?.count ?? 0,
      })),
    [categories, categoryCounts]
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const activeLabel =
    activeId === "all"
      ? "全部文案"
      : activeId === "favorites"
        ? "我的收藏"
        : categoryMap.get(activeId)?.label ?? "全部文案";

  function handleSelectCategory(id: string) {
    setActiveId(id);
    setPage(1);
    loadPage(1, id, debouncedQuery);
  }

  /** 点击热门收藏榜：跳转详情页（服务端分页下不做客户端单条过滤） */
  function handleHotSelect(id: string) {
    router.push(`/copy/${id}`);
  }

  function handleContribute() {
    if (isLoggedIn) setNewSheetOpen(true);
    else router.push("/user/login");
  }

  /** 投稿成功：插入当前列表顶部并回到全部视图第 1 页，实时可见 */
  function handleItemSaved(newItem: CopyItem) {
    setLocalItems((prev) =>
      prev.some((item) => item.id === newItem.id) ? prev : [newItem, ...prev]
    );
    setQuery("");
    setDebouncedQuery("");
    setPage(1);
    if (activeId !== "all") {
      setActiveId("all");
      router.push("/");
    }
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
    setFavoritesCount((prev) => Math.max(0, prev + (willFavorite ? 1 : -1)));

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
      setFavoritesCount((prev) => Math.max(0, prev + (willFavorite ? -1 : 1)));
    }
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          activeId={activeId}
          totalCount={total}
          favoriteCount={favoritesCount}
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
                  const value = event.target.value;
                  setQuery(value);
                  setPage(1);
                  // 同步 URL（不触发导航）：404 搜索框提交到 /?q= 后，地址栏与输入一致
                  const url = new URL(window.location.href);
                  if (value) url.searchParams.set("q", value);
                  else url.searchParams.delete("q");
                  window.history.replaceState(null, "", url.toString());
                }}
                placeholder="搜索标题或内容…"
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
                    {total} ITEMS
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                  加载中…
                </div>
              ) : localItems.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
                  {localItems.map((item) => {
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
                        setDebouncedQuery("");
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
                    disabled={safePage <= 1 || loading}
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
                    disabled={safePage >= totalPages || loading}
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
