"use client";

import { PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/library/app-sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Category } from "@/lib/copywriting";

export interface BrowseSidebarData {
  categories: Category[];
  categoryCounts: { id: string; count: number }[];
  favoritesCount: number;
  isLoggedIn: boolean;
  userNickname: string;
  siteName: string;
}

/**
 * 前台浏览页统一布局：全局侧边栏（资料库/首页/全部文案/我的收藏/分类）+ 内容区。
 * 详情页、FAQ、关于、分类总览等页面均使用此骨架，与 /home、/category 的 LibraryShell 视觉一致。
 */
export function BrowseShell({
  activeId,
  sidebar,
  header,
  children,
}: {
  /** 侧边栏当前高亮项：all/favorites/分类 id/categories/none（详情页等无匹配项） */
  activeId: string;
  sidebar: BrowseSidebarData;
  /** 自定义顶栏右侧内容（缺省为投稿按钮） */
  header?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();

  function handleSelect(id: string) {
    // 收藏是用户私有视图：跳 /home?view=favorites 展示；all/分类由 AppSidebar 内部路由
    if (id === "favorites") router.push("/home?view=favorites");
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          activeId={activeId}
          totalCount={
            sidebar.categoryCounts.reduce((sum, c) => sum + c.count, 0) + 0
          }
          favoriteCount={sidebar.favoritesCount}
          categoryTotal={sidebar.categories.length}
          categories={sidebar.categories.map((c) => ({
            id: c.id,
            label: c.label,
            count:
              sidebar.categoryCounts.find((x) => x.id === c.id)?.count ?? 0,
            color: c.color,
          }))}
          onSelect={handleSelect}
          isLoggedIn={sidebar.isLoggedIn}
          userNickname={sidebar.userNickname}
          siteName={sidebar.siteName}
        />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:gap-3 sm:px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-0 h-4 sm:mr-1" />
            <div className="min-w-0 flex-1" />
            {header ?? (
              <Button
                size="lg"
                className="hidden bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 sm:inline-flex"
                onClick={() =>
                  router.push(sidebar.isLoggedIn ? "/home" : "/user/login")
                }
              >
                <PenLine />
                投稿文案
              </Button>
            )}
            {!header && (
              <Button
                size="icon-lg"
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 sm:hidden"
                aria-label="投稿文案"
                onClick={() =>
                  router.push(sidebar.isLoggedIn ? "/home" : "/user/login")
                }
              >
                <PenLine />
              </Button>
            )}
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
